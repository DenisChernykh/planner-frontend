import { describe, expect, it, vi } from 'vitest'

import {
  CommandIntentController,
  CommandIntentStateError,
  type CommandIntentState,
  OfflineSubmissionError,
} from './command-intent'

const ids = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
]

const unknownOutcome = new Error('connection ended after send')
const staleOutcome = new Error('authoritative revision changed')
const failedOutcome = new Error('request was rejected')
const reconciliationFailure = new Error('authoritative refetch failed')

type TestPayload = { focus: string; revision?: string }
type TestController = CommandIntentController<TestPayload, string>

type StateFixture = {
  controller: TestController
  cleanup: () => Promise<void>
}

function createIdFactory() {
  let index = 0
  return () => ids[index++] ?? crypto.randomUUID()
}

function createController() {
  return new CommandIntentController<TestPayload, string>(
    (error) => error === unknownOutcome,
    createIdFactory(),
    (error) => error === staleOutcome,
  )
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

async function reconcileSuccessfully(controller: TestController) {
  await controller.reconcile(async () => undefined)
}

async function createControllerInState(
  state: CommandIntentState,
): Promise<StateFixture> {
  const controller = createController()
  const noCleanup = async () => undefined

  if (state === 'unreconciled') return { controller, cleanup: noCleanup }

  if (state === 'reconciling') {
    const deferred = createDeferred<void>()
    const reconciliation = controller.reconcile(() => deferred.promise)

    return {
      controller,
      cleanup: async () => {
        deferred.resolve()
        await reconciliation
      },
    }
  }

  await reconcileSuccessfully(controller)
  if (state === 'abandoned') return { controller, cleanup: noCleanup }

  controller.begin({ focus: 'Исходный intent' })
  if (state === 'ready') return { controller, cleanup: noCleanup }

  if (state === 'pending') {
    const deferred = createDeferred<string>()
    const request = controller.submit(() => deferred.promise)

    return {
      controller,
      cleanup: async () => {
        deferred.resolve('confirmed')
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
  await controller.submit(() => Promise.reject(error)).catch(() => undefined)
  return { controller, cleanup: noCleanup }
}

describe('CommandIntentController', () => {
  it('requires a successful authoritative reconciliation before the first begin', async () => {
    const controller = createController()
    const refetch = vi.fn(async () => undefined)

    expect(controller.state).toBe('unreconciled')
    expect(() => controller.begin({ focus: 'Слишком рано' })).toThrow(
      CommandIntentStateError,
    )

    await expect(controller.reconcile(refetch)).resolves.toBeUndefined()
    expect(refetch).toHaveBeenCalledOnce()
    expect(controller.state).toBe('abandoned')
    expect(controller.begin({ focus: 'После сверки' }).commandId).toBe(ids[0])
  })

  it('keeps a new controller blocked when its initial reconciliation fails', async () => {
    const controller = createController()

    await expect(
      controller.reconcile(() => Promise.reject(reconciliationFailure)),
    ).rejects.toBe(reconciliationFailure)

    expect(controller.state).toBe('unreconciled')
    expect(controller.payload).toBeNull()
    expect(() => controller.begin({ focus: 'Обход refetch' })).toThrow(
      CommandIntentStateError,
    )
  })

  it('requires reconciliation again after a reload creates a new controller', async () => {
    const previousSurface = createController()
    await reconcileSuccessfully(previousSurface)
    previousSurface.begin({ focus: 'До reload' })

    const reloadedSurface = createController()
    expect(reloadedSurface.state).toBe('unreconciled')
    expect(() => reloadedSurface.begin({ focus: 'После reload' })).toThrow(
      CommandIntentStateError,
    )

    await reconcileSuccessfully(reloadedSurface)
    expect(reloadedSurface.begin({ focus: 'После refetch' })).toMatchObject({
      focus: 'После refetch',
    })
  })

  it('deduplicates same-tick submits and sends one immutable envelope', async () => {
    const deferred = createDeferred<string>()
    const sender = vi.fn(() => deferred.promise)
    const controller = createController()
    await reconcileSuccessfully(controller)
    const payload = controller.begin({ focus: 'Поддерживать друг друга' })

    const first = controller.submit(sender)
    const duplicate = controller.submit(sender)

    expect(duplicate).toBe(first)
    expect(sender).toHaveBeenCalledTimes(0)
    await Promise.resolve()
    expect(sender).toHaveBeenCalledTimes(1)
    expect(sender).toHaveBeenCalledWith(payload)
    expect(Object.isFrozen(payload)).toBe(true)

    deferred.resolve('ok')
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
    const controller = createController()
    await reconcileSuccessfully(controller)
    controller.begin({ focus: 'Общий ритм' })

    await expect(controller.submit(sender)).rejects.toBe(unknownOutcome)
    expect(controller.state).toBe('unknown')
    await expect(controller.submit(sender)).resolves.toBe('confirmed')

    expect(envelopes[1]).toBe(envelopes[0])
    expect(controller.payload?.commandId).toBe(ids[0])
  })

  it('restores unknown and its exact envelope when reconciliation fails', async () => {
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
    const controller = createController()
    await reconcileSuccessfully(controller)
    const original = controller.begin({ focus: 'Неизвестный исход' })
    await controller.submit(sender).catch(() => undefined)

    await expect(
      controller.reconcile(() => Promise.reject(reconciliationFailure)),
    ).rejects.toBe(reconciliationFailure)
    expect(controller.state).toBe('unknown')
    expect(controller.payload).toBe(original)

    await expect(controller.submit(sender)).resolves.toBe('confirmed')
    expect(envelopes[1]).toBe(envelopes[0])
  })

  it('builds a new payload from refreshed revision only after stale reconciliation', async () => {
    const controller = createController()
    let authoritativeRevision = '41'
    await reconcileSuccessfully(controller)
    const first = controller.begin({
      focus: 'Первый вариант',
      revision: authoritativeRevision,
    })
    await expect(
      controller.submit(() => Promise.reject(staleOutcome)),
    ).rejects.toBe(staleOutcome)

    const refetch = vi.fn(async () => {
      authoritativeRevision = '42'
    })
    await controller.reconcile(refetch)
    const next = controller.begin({
      focus: 'После обновления',
      revision: authoritativeRevision,
    })

    expect(refetch).toHaveBeenCalledOnce()
    expect(first.commandId).toBe(ids[0])
    expect(next.commandId).toBe(ids[1])
    expect(next.revision).toBe('42')
    expect(next).not.toBe(first)
    expect(controller.state).toBe('ready')
  })

  it('keeps stale blocked and preserves its envelope when refetch fails', async () => {
    const controller = createController()
    await reconcileSuccessfully(controller)
    const original = controller.begin({ focus: 'Устаревшая revision' })
    await controller
      .submit(() => Promise.reject(staleOutcome))
      .catch(() => undefined)

    await expect(
      controller.reconcile(() => Promise.reject(reconciliationFailure)),
    ).rejects.toBe(reconciliationFailure)

    expect(controller.state).toBe('stale')
    expect(controller.payload).toBe(original)
    expect(() => controller.begin({ focus: 'Обход refetch' })).toThrow(
      CommandIntentStateError,
    )

    await controller.reconcile(async () => undefined)
    const replacement = controller.begin({ focus: 'После успешного refetch' })
    expect(replacement.commandId).toBe(ids[1])
  })

  it.each(['unreconciled', 'unknown', 'stale'] as const)(
    'does not let abandon bypass reconciliation from %s',
    async (state) => {
      const fixture = await createControllerInState(state)

      fixture.controller.abandon()

      expect(fixture.controller.state).toBe('unreconciled')
      expect(fixture.controller.payload).toBeNull()
      expect(() =>
        fixture.controller.begin({ focus: 'Обход через abandon' }),
      ).toThrow(CommandIntentStateError)

      await reconcileSuccessfully(fixture.controller)
      expect(
        fixture.controller.begin({ focus: 'После новой сверки' }),
      ).toMatchObject({ focus: 'После новой сверки' })
      await fixture.cleanup()
    },
  )

  it('deduplicates concurrent reconciliation and blocks submit until it settles', async () => {
    const fixture = await createControllerInState('unknown')
    const original = fixture.controller.payload
    const deferred = createDeferred<void>()
    const firstRefetch = vi.fn(() => deferred.promise)
    const skippedRefetch = vi.fn(async () => undefined)

    const first = fixture.controller.reconcile(firstRefetch)
    const duplicate = fixture.controller.reconcile(skippedRefetch)

    expect(duplicate).toBe(first)
    expect(fixture.controller.state).toBe('reconciling')
    expect(fixture.controller.payload).toBe(original)
    expect(() => fixture.controller.submit(async () => 'unexpected')).toThrow(
      CommandIntentStateError,
    )
    expect(() => fixture.controller.abandon()).toThrow(CommandIntentStateError)
    await Promise.resolve()
    expect(firstRefetch).toHaveBeenCalledOnce()
    expect(skippedRefetch).not.toHaveBeenCalled()

    deferred.resolve()
    await expect(first).resolves.toBeUndefined()
    expect(fixture.controller.state).toBe('abandoned')
    expect(fixture.controller.payload).toBeNull()
  })

  it('keeps a new stale intent blocked while reconciliation is pending', async () => {
    const fixture = await createControllerInState('stale')
    const deferred = createDeferred<void>()
    let authoritativeRevision = '41'
    const reconciliation = fixture.controller.reconcile(async () => {
      await deferred.promise
      authoritativeRevision = '42'
    })

    expect(fixture.controller.state).toBe('reconciling')
    expect(() => fixture.controller.submit(async () => 'unexpected')).toThrow(
      CommandIntentStateError,
    )
    expect(() =>
      fixture.controller.begin({ focus: 'Параллельная замена' }),
    ).toThrow(CommandIntentStateError)

    deferred.resolve()
    await expect(reconciliation).resolves.toBeUndefined()
    const replacement = fixture.controller.begin({
      focus: 'После refetch',
      revision: authoritativeRevision,
    })
    expect(replacement.revision).toBe('42')
    expect(fixture.controller.state).toBe('ready')
  })

  it.each([
    'unreconciled',
    'reconciling',
    'ready',
    'pending',
    'unknown',
    'confirmed',
    'failed',
    'stale',
  ] as const)(
    'does not let begin replace or bypass the %s state',
    async (state) => {
      const fixture = await createControllerInState(state)
      const originalEnvelope = fixture.controller.payload

      expect(() =>
        fixture.controller.begin({ focus: 'Скрытая замена' }),
      ).toThrow(CommandIntentStateError)
      expect(fixture.controller.state).toBe(state)
      expect(fixture.controller.payload).toBe(originalEnvelope)

      await fixture.cleanup()
    },
  )

  it.each(['abandoned', 'ready', 'pending', 'confirmed', 'failed'] as const)(
    'rejects authoritative reconciliation from %s',
    async (state) => {
      const fixture = await createControllerInState(state)
      const originalEnvelope = fixture.controller.payload

      expect(() => fixture.controller.reconcile(async () => undefined)).toThrow(
        CommandIntentStateError,
      )
      expect(fixture.controller.state).toBe(state)
      expect(fixture.controller.payload).toBe(originalEnvelope)

      await fixture.cleanup()
    },
  )

  it.each([
    'unreconciled',
    'reconciling',
    'abandoned',
    'confirmed',
    'failed',
    'stale',
  ] as const)(
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

  it.each(['pending', 'reconciling'] as const)(
    'rejects abandon while %s work is in flight',
    async (state) => {
      const fixture = await createControllerInState(state)

      expect(() => fixture.controller.abandon()).toThrow(
        CommandIntentStateError,
      )
      expect(fixture.controller.state).toBe(state)

      await fixture.cleanup()
    },
  )

  it('cannot send an abandoned intent later', async () => {
    const controller = createController()
    await reconcileSuccessfully(controller)
    controller.begin({ focus: 'Не отправлять позднее' })
    controller.abandon()

    expect(() => controller.submit(async () => 'unexpected')).toThrow(
      CommandIntentStateError,
    )
  })

  it('does not call or queue a sender while offline', async () => {
    const sender = vi.fn(async () => 'unexpected')
    const controller = createController()
    await reconcileSuccessfully(controller)
    controller.begin({ focus: 'Только явная отправка online' })

    await expect(
      controller.submitWhenOnline(false, sender),
    ).rejects.toBeInstanceOf(OfflineSubmissionError)
    expect(sender).not.toHaveBeenCalled()
    expect(controller.state).toBe('ready')
  })
})
