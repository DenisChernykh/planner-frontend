import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  ApiNetworkError,
  ApiProblemError,
  type TrackingFactMutationResponseV1Dto,
} from '@/shared/api'

import { useRecordFactIntent } from './use-record-fact-intent'

const result: TrackingFactMutationResponseV1Dto = {
  aggregateId: '11111111-1111-4111-8111-111111111111',
  aggregateRevision: '2',
  kind: 'tracking.fact-record.v1',
}

function setup(
  send: (
    body: Record<string, unknown>,
  ) => Promise<TrackingFactMutationResponseV1Dto>,
  refetch = vi.fn(async () => undefined),
) {
  const hook = renderHook(() =>
    useRecordFactIntent({
      finalizePayload: (payload, commandId) => ({ ...payload, commandId }),
      mapValues: (values: { value: string }) => ({ value: values.value }),
      refetch,
      send,
    }),
  )
  return { hook, refetch }
}

describe('useRecordFactIntent', () => {
  it('creates one command and one request for same-tick duplicate submits', async () => {
    let resolve!: (value: TrackingFactMutationResponseV1Dto) => void
    const request = new Promise<TrackingFactMutationResponseV1Dto>((settle) => {
      resolve = settle
    })
    const send = vi.fn(() => request)
    const { hook, refetch } = setup(send)
    let first!: Promise<void>
    let second!: Promise<void>

    act(() => {
      first = hook.result.current.submit({ value: '1.20' }, true)
      second = hook.result.current.submit({ value: '9.99' }, true)
    })

    expect(second).toBe(first)
    await act(async () => {
      resolve(result)
      await first
    })
    expect(send).toHaveBeenCalledOnce()
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      commandId: expect.any(String),
      value: '1.20',
    })
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('keeps the exact command id and payload when retrying an unknown outcome', async () => {
    const send = vi
      .fn<
        (
          _: Record<string, unknown>,
        ) => Promise<TrackingFactMutationResponseV1Dto>
      >()
      .mockRejectedValueOnce(new ApiNetworkError())
      .mockResolvedValueOnce(result)
    const { hook, refetch } = setup(send)

    await act(async () => {
      await hook.result.current.submit({ value: '0.25' }, true)
    })
    expect(hook.result.current.status).toBe('unknown')
    const firstBody = send.mock.calls[0]?.[0]

    await act(async () => {
      await hook.result.current.retry(true)
    })
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1]?.[0]).toEqual(firstBody)
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('reconciles a stale target before creating a new command id', async () => {
    const conflict = new ApiProblemError(
      {
        type: 'https://planner.example.test/problems/conflict',
        title: 'Conflict',
        status: 409,
        detail: 'Conflict',
        instance: 'urn:request:conflict',
        code: 'TRACKING_FACT_TARGET_UNAVAILABLE',
        requestId: 'request-conflict',
      },
      null,
    )
    const send = vi
      .fn<
        (
          _: Record<string, unknown>,
        ) => Promise<TrackingFactMutationResponseV1Dto>
      >()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce(result)
    const { hook, refetch } = setup(send)

    await act(async () => {
      await hook.result.current.submit({ value: '1' }, true)
    })
    const firstCommandId = send.mock.calls[0]?.[0]?.commandId
    expect(hook.result.current.status).toBe('stale')

    await act(async () => {
      await hook.result.current.submit({ value: '2' }, true)
    })
    const secondCommandId = send.mock.calls[1]?.[0]?.commandId
    expect(secondCommandId).not.toBe(firstCommandId)
    expect(refetch).toHaveBeenCalledTimes(2)
  })

  it('requires recovery after a confirmed mutation refresh fails', async () => {
    const send = vi
      .fn<
        (
          _: Record<string, unknown>,
        ) => Promise<TrackingFactMutationResponseV1Dto>
      >()
      .mockResolvedValue(result)
    const refetch = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockRejectedValueOnce(new Error('still unavailable'))
      .mockResolvedValueOnce(undefined)
    const { hook } = setup(send, refetch)

    await act(async () => {
      await hook.result.current.submit({ value: '1' }, true)
    })
    expect(send).toHaveBeenCalledOnce()
    expect(hook.result.current.status).toBe('error')

    await act(async () => {
      await hook.result.current.submit({ value: '2' }, true)
    })
    expect(send).toHaveBeenCalledOnce()
    expect(refetch).toHaveBeenCalledTimes(2)

    await act(async () => {
      await hook.result.current.submit({ value: '2' }, true)
    })
    expect(send).toHaveBeenCalledTimes(2)
    expect(refetch).toHaveBeenCalledTimes(4)
  })

  it('does not send a stale intent when authoritative reconciliation fails', async () => {
    const conflict = new ApiProblemError(
      {
        type: 'https://planner.example.test/problems/conflict',
        title: 'Conflict',
        status: 409,
        detail: 'Conflict',
        instance: 'urn:request:conflict',
        code: 'TRACKING_FACT_TARGET_UNAVAILABLE',
        requestId: 'request-conflict',
      },
      null,
    )
    const send = vi
      .fn<
        (
          _: Record<string, unknown>,
        ) => Promise<TrackingFactMutationResponseV1Dto>
      >()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce(result)
    const refetch = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockResolvedValueOnce(undefined)
    const { hook } = setup(send, refetch)

    await act(async () => {
      await hook.result.current.submit({ value: '1' }, true)
    })
    await act(async () => {
      await hook.result.current.submit({ value: '2' }, true)
    })
    expect(send).toHaveBeenCalledOnce()
    expect(refetch).toHaveBeenCalledOnce()
    expect(hook.result.current.status).toBe('error')

    await act(async () => {
      await hook.result.current.submit({ value: '2' }, true)
    })
    expect(send).toHaveBeenCalledTimes(2)
    expect(refetch).toHaveBeenCalledTimes(3)
  })

  it('does not call an operation while offline', async () => {
    const send = vi.fn(async () => result)
    const { hook } = setup(send)

    await act(async () => {
      await hook.result.current.submit({ value: '1' }, false)
    })
    expect(send).not.toHaveBeenCalled()
    expect(hook.result.current.status).toBe('error')
  })
})
