import { describe, expect, it, vi } from 'vitest'

import {
  CommandIntentController,
  CommandIntentStateError,
  OfflineSubmissionError,
} from './command-intent'

const ids = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
]

const unknownOutcome = new Error('connection ended after send')
const staleOutcome = new Error('authoritative revision changed')
const failedOutcome = new Error('request was rejected')

type TestPayload = { focus: string }
type TestController = CommandIntentController<TestPayload, string>

type StateFixture = {
  controller: TestController
  cleanup: () => Promise<void>
}

function createIdFactory() {
  let index = 0
  return () => ids[index++] ?? crypto.randomUUID()
}

async function createControllerInState(
  state: Exclude<
    CommandIntentController<TestPayload, string>['state'],
    'ready'
  >,
): Promise<StateFixture> {
  const controller = new CommandIntentController<TestPayload, string>(
    (error) => error === unknownOutcome,
    createIdFactory(),
    (error) => error === staleOutcome,
  )
  const noCleanup = async () => undefined

  if (state === 'abandoned') return { controller, cleanup: noCleanup }

  controller.begin({ focus: 'Исходный intent' })

  if (state === 'pending') {
    let resolveRequest: ((value: string) => void) | undefined
    const request = controller.submit(
      () =>
        new Promise<string>((resolve) => {
          resolveRequest = resolve
        }),
    )
    await Promise.resolve()

    return {
      controller,
      cleanup: async () => {
        resolveRequest?.('confirmed')
        await request
      },
    }
  }

  if (state === 'confirmed') {
    await controller.submit(async () => 'confirmed')
    return { controller, cleanup: noCleanup }
  }

  const error =
    state === 'unknown'
      ? unknownOutcome
      : state === 'stale'
        ? staleOutcome
        : failedOutcome
  await controller.submit(async () => Promise.reject(error)).catch(() => {})
  return { controller, cleanup: noCleanup }
}

describe('CommandIntentController', () => {
  it('deduplicates same-tick submits and sends one immutable envelope', async () => {
    let resolveRequest: ((value: string) => void) | undefined
    const sender = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRequest = resolve
        }),
    )
    const controller = new CommandIntentController<{ focus: string }, string>(
      () => false,
      createIdFactory(),
    )
    const payload = controller.begin({ focus: 'Поддерживать друг друга' })

    const first = controller.submit(sender)
    const duplicate = controller.submit(sender)

    expect(duplicate).toBe(first)
    expect(sender).toHaveBeenCalledTimes(0)
    await Promise.resolve()
    expect(sender).toHaveBeenCalledTimes(1)
    expect(sender).toHaveBeenCalledWith(payload)
    expect(Object.isFrozen(payload)).toBe(true)

    resolveRequest?.('ok')
    await expect(first).resolves.toBe('ok')
    expect(controller.state).toBe('confirmed')
  })

  it('retries an unknown outcome with the exact envelope and commandId', async () => {
    const envelopes: unknown[] = []
    const sender = vi
      .fn()
      .mockImplementationOnce(async (payload) => {
        envelopes.push(payload)
        throw unknownOutcome
      })
      .mockImplementationOnce(async (payload) => {
        envelopes.push(payload)
        return 'confirmed'
      })
    const controller = new CommandIntentController<{ focus: string }, string>(
      (error) => error === unknownOutcome,
      createIdFactory(),
    )
    controller.begin({ focus: 'Общий ритм' })

    await expect(controller.submit(sender)).rejects.toBe(unknownOutcome)
    expect(controller.state).toBe('unknown')
    await expect(controller.submit(sender)).resolves.toBe('confirmed')

    expect(envelopes[1]).toBe(envelopes[0])
    expect(controller.payload?.commandId).toBe(ids[0])
  })

  it('uses a new commandId only after stale reconciliation', async () => {
    const controller = new CommandIntentController<{ focus: string }, string>(
      () => false,
      createIdFactory(),
      (error) => error === staleOutcome,
    )
    const first = controller.begin({ focus: 'Первый вариант' })
    await expect(
      controller.submit(async () => Promise.reject(staleOutcome)),
    ).rejects.toBe(staleOutcome)

    expect(controller.state).toBe('stale')
    const next = controller.replaceAfterStale({ focus: 'После обновления' })

    expect(first.commandId).toBe(ids[0])
    expect(next.commandId).toBe(ids[1])
    expect(next).not.toBe(first)
    expect(controller.state).toBe('ready')
  })

  it.each([
    'ready',
    'pending',
    'unknown',
    'confirmed',
    'failed',
    'stale',
  ] as const)(
    'does not let begin replace an existing %s intent',
    async (state) => {
      const fixture =
        state === 'ready'
          ? {
              controller: new CommandIntentController<TestPayload, string>(
                () => false,
                createIdFactory(),
              ),
              cleanup: async () => undefined,
            }
          : await createControllerInState(state)
      if (state === 'ready') {
        fixture.controller.begin({ focus: 'Исходный intent' })
      }
      const originalEnvelope = fixture.controller.payload

      expect(() =>
        fixture.controller.begin({ focus: 'Скрытая замена' }),
      ).toThrow(CommandIntentStateError)
      expect(fixture.controller.state).toBe(state)
      expect(fixture.controller.payload).toBe(originalEnvelope)

      await fixture.cleanup()
    },
  )

  it.each([
    'abandoned',
    'ready',
    'pending',
    'unknown',
    'confirmed',
    'failed',
  ] as const)(
    'allows replaceAfterStale only after a stale outcome, not from %s',
    async (state) => {
      const fixture =
        state === 'ready'
          ? {
              controller: new CommandIntentController<TestPayload, string>(
                () => false,
                createIdFactory(),
              ),
              cleanup: async () => undefined,
            }
          : await createControllerInState(state)
      if (state === 'ready') {
        fixture.controller.begin({ focus: 'Исходный intent' })
      }
      const originalEnvelope = fixture.controller.payload

      expect(() =>
        fixture.controller.replaceAfterStale({ focus: 'Новый intent' }),
      ).toThrow(CommandIntentStateError)
      expect(fixture.controller.state).toBe(state)
      expect(fixture.controller.payload).toBe(originalEnvelope)

      await fixture.cleanup()
    },
  )

  it.each(['abandoned', 'confirmed', 'failed', 'stale'] as const)(
    'rejects submit from the non-submittable %s state',
    async (state) => {
      const fixture = await createControllerInState(state)

      expect(() => fixture.controller.submit(async () => 'unexpected')).toThrow(
        CommandIntentStateError,
      )
      expect(fixture.controller.state).toBe(state)

      await fixture.cleanup()
    },
  )

  it('cannot send an abandoned intent later', () => {
    const controller = new CommandIntentController<{ focus: string }, string>(
      () => false,
      createIdFactory(),
    )
    controller.begin({ focus: 'Не отправлять позднее' })
    controller.abandon()

    expect(() => controller.submit(async () => 'unexpected')).toThrow(
      CommandIntentStateError,
    )
  })

  it('does not call or queue a sender while offline', async () => {
    const sender = vi.fn(async () => 'unexpected')
    const controller = new CommandIntentController<{ focus: string }, string>(
      () => false,
      createIdFactory(),
    )
    controller.begin({ focus: 'Только явная отправка online' })

    await expect(
      controller.submitWhenOnline(false, sender),
    ).rejects.toBeInstanceOf(OfflineSubmissionError)
    expect(sender).not.toHaveBeenCalled()
    expect(controller.state).toBe('ready')
  })
})
