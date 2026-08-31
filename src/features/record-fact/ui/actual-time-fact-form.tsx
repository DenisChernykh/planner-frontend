import { useZodForm } from '@/shared/lib/form'
import {
  ScalarFactControllerRecordTime422Response,
  scalarFactControllerRecordTime,
} from '@/shared/api'
import { Button, TextField } from '@/shared/ui'

import {
  finalizeTimeFact,
  mapTimeFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import { actualTimeFactFormSchema } from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { useRecordFactIntentScope } from '../model/record-fact-intent-scope'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function ActualTimeFactForm({
  canMutate,
  target,
  isOnline,
  refetch,
  start,
  end,
  label = 'Фактическое время',
}: Readonly<{
  canMutate: boolean
  end: string
  isOnline: boolean
  label?: string
  refetch: () => Promise<unknown>
  start: string
  target: FactTarget
}>) {
  const form = useZodForm(actualTimeFactFormSchema, {
    defaultValues: { value: '' },
  })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeTimeFact,
    mapValues: (values: { value: string }) => mapTimeFact(values, target),
    refetch,
    send: (body) => scalarFactControllerRecordTime(body),
  })
  useRecordFactIntentScope(intent.status, intent.abandon)
  const error = form.formState.errors.value?.message
  const locked =
    intent.status === 'pending' ||
    intent.status === 'reconciling' ||
    intent.status === 'unknown' ||
    intent.isTerminal

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        void intent.submit(values, canMutate)
      })}
    >
      <TextField
        className="min-w-28 flex-1"
        label={`${label} (${start}–${end})`}
        type="time"
        disabled={locked || !canMutate}
        error={error}
        {...form.register('value')}
      />
      {canMutate && (
        <Button
          type="submit"
          size="sm"
          disabled={locked || !canMutate}
          isLoading={
            intent.status === 'pending' || intent.status === 'reconciling'
          }
          loadingLabel="Сохраняем"
        >
          Записать
        </Button>
      )}
      <RecordFactFormFeedback
        allowedPointers={[
          '/expectationDate',
          '/planGoalSnapshotId',
          '/publicationId',
          '/value',
        ]}
        error={intent.error}
        isOnline={isOnline}
        canMutate={canMutate}
        onAbandon={intent.abandon}
        onRetry={() => void intent.retry(canMutate)}
        problemSchema={ScalarFactControllerRecordTime422Response}
        status={intent.status}
      />
    </form>
  )
}
