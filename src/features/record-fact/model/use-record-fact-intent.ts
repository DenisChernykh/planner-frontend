import { useCallback, useRef, useState } from 'react'

import {
  ApiNetworkError,
  isProblemCode,
  type TrackingFactMutationResponseV1Dto,
} from '@/shared/api'
import {
  CommandIntentController,
  OfflineSubmissionError,
} from '@/shared/lib/command'

export type RecordFactIntentStatus =
  'idle' | 'reconciling' | 'pending' | 'unknown' | 'stale' | 'success' | 'error'

type MapValues<TValues, TPayload extends object> = (values: TValues) => TPayload
type FinalizePayload<TPayload extends object, TBody extends object> = (
  payload: TPayload,
  commandId: string,
) => TBody

type RecordFactIntentOptions<
  TValues,
  TPayload extends object,
  TBody extends object,
> = Readonly<{
  mapValues: MapValues<TValues, TPayload>
  finalizePayload: FinalizePayload<TPayload, TBody>
  send: (body: TBody) => Promise<TrackingFactMutationResponseV1Dto>
  refetch: () => Promise<unknown>
}>

function isUnknownOutcome(error: unknown) {
  return (
    error instanceof ApiNetworkError ||
    isProblemCode(error, 'DEPENDENCY_UNAVAILABLE')
  )
}

function isStaleOutcome(error: unknown) {
  return (
    isProblemCode(error, 'TRACKING_FACT_REVISION_CONFLICT') ||
    isProblemCode(error, 'TRACKING_FACT_TARGET_UNAVAILABLE')
  )
}

/**
 * Keeps one scalar fact intent in memory and maps it to a generated DTO only
 * at send time, after the controller has assigned the command id.
 */
export function useRecordFactIntent<
  TValues,
  TPayload extends object,
  TBody extends object,
>({
  mapValues,
  finalizePayload,
  send,
  refetch,
}: RecordFactIntentOptions<TValues, TPayload, TBody>) {
  const [, rerender] = useState(0)
  const [controller] = useState(
    () =>
      new CommandIntentController<TPayload, TrackingFactMutationResponseV1Dto>(
        isUnknownOutcome,
        undefined,
        isStaleOutcome,
      ),
  )
  const senderRef = useRef<
    | ((
        payload: Readonly<TPayload & { commandId: string }>,
      ) => Promise<TrackingFactMutationResponseV1Dto>)
    | null
  >(null)
  const submitInFlightRef = useRef<Promise<void> | null>(null)
  const needsRecoveryRef = useRef(false)

  const [status, setStatus] = useState<RecordFactIntentStatus>('idle')
  const [error, setError] = useState<unknown>(undefined)

  const refreshView = useCallback(() => {
    rerender((version) => version + 1)
  }, [])

  const confirmAndRefresh = useCallback(
    async (result: TrackingFactMutationResponseV1Dto) => {
      try {
        await refetch()
      } catch (refreshError) {
        needsRecoveryRef.current = true
        throw refreshError
      }
      controller.abandon()
      setStatus('success')
      setError(undefined)
      refreshView()
      return result
    },
    [controller, refetch, refreshView],
  )

  const execute = useCallback(
    async (values: TValues, isOnline: boolean) => {
      if (!isOnline) {
        setStatus('error')
        const offlineError = new OfflineSubmissionError()
        setError(offlineError)
        refreshView()
        throw offlineError
      }

      setError(undefined)
      if (needsRecoveryRef.current) {
        setStatus('reconciling')
        refreshView()
        try {
          await refetch()
        } catch (reconciliationError) {
          setError(reconciliationError)
          setStatus('error')
          refreshView()
          throw reconciliationError
        }
        needsRecoveryRef.current = false
        controller.abandon()
      }
      if (controller.state === 'unknown' && senderRef.current !== null) {
        setStatus('pending')
        refreshView()
        try {
          const result = await controller.submit(senderRef.current)
          return await confirmAndRefresh(result)
        } catch (submissionError) {
          setError(submissionError)
          setStatus(controller.state === 'unknown' ? 'unknown' : 'error')
          refreshView()
          throw submissionError
        }
      }

      if (controller.state === 'stale') {
        setStatus('reconciling')
        refreshView()
        try {
          await controller.reconcile(refetch)
        } catch (reconciliationError) {
          setError(reconciliationError)
          setStatus('error')
          refreshView()
          throw reconciliationError
        }
      } else if (controller.state === 'unreconciled') {
        setStatus('reconciling')
        refreshView()
        await controller.reconcile(async () => undefined)
      } else if (
        controller.state === 'confirmed' ||
        controller.state === 'failed'
      ) {
        controller.abandon()
      }

      controller.begin(mapValues(values))
      senderRef.current = (envelope) =>
        send(finalizePayload(envelope, envelope.commandId))
      setStatus('pending')
      refreshView()

      try {
        const result = await controller.submit(senderRef.current)
        return await confirmAndRefresh(result)
      } catch (submissionError) {
        setError(submissionError)
        setStatus(
          controller.state === 'unknown'
            ? 'unknown'
            : controller.state === 'stale'
              ? 'stale'
              : 'error',
        )
        refreshView()
        throw submissionError
      }
    },
    [
      confirmAndRefresh,
      controller,
      finalizePayload,
      mapValues,
      refreshView,
      refetch,
      send,
    ],
  )

  const submit = useCallback(
    (values: TValues, isOnline: boolean) => {
      if (submitInFlightRef.current !== null) {
        return submitInFlightRef.current
      }

      const request = execute(values, isOnline).then(
        () => undefined,
        () => undefined,
      )
      submitInFlightRef.current = request
      void request.finally(() => {
        if (submitInFlightRef.current === request) {
          submitInFlightRef.current = null
        }
      })
      return request
    },
    [execute],
  )

  return {
    error,
    retry: (isOnline: boolean) => {
      if (controller.state !== 'unknown' || senderRef.current === null) {
        return Promise.reject(new Error('No unknown fact intent to retry'))
      }
      return submit({} as TValues, isOnline)
    },
    state: controller.state,
    status,
    submit,
  }
}
