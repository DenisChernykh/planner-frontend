import {
  ScalarFactControllerRecordCheckpoint422Response,
  scalarFactControllerRecordCheckpoint,
} from '@/shared/api'
import { useZodForm } from '@/shared/lib/form'
import { Button, TextField } from '@/shared/ui'

import {
  finalizeCheckpointFact,
  mapCheckpointFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import { actualTimeFactFormSchema } from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { useRecordFactIntentScope } from '../model/record-fact-intent-scope'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function CheckpointTimeForm({
  canMutate,
  canRetry,
  checkpointId,
  isOnline,
  label,
  refetch,
  target,
}: Readonly<{
  canMutate: boolean
  canRetry: boolean
  checkpointId: string
  isOnline: boolean
  label: string
  refetch: () => Promise<unknown>
  target: FactTarget
}>) {
  const form = useZodForm(actualTimeFactFormSchema, {
    defaultValues: { value: '' },
  })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeCheckpointFact,
    mapValues: (values: { value: string }) =>
      mapCheckpointFact(checkpointId, values, target, 'actual_time'),
    refetch,
    send: (body) => scalarFactControllerRecordCheckpoint(body),
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
        label={label}
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
          '/checkpointId',
          '/expectationDate',
          '/planGoalSnapshotId',
          '/publicationId',
          '/value',
        ]}
        error={intent.error}
        isOnline={isOnline}
        canRetry={canRetry}
        onAbandon={intent.abandon}
        onRetry={() => void intent.retry(canRetry)}
        problemSchema={ScalarFactControllerRecordCheckpoint422Response}
        status={intent.status}
      />
    </form>
  )
}
