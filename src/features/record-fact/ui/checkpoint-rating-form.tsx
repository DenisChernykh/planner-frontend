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
import {
  createRatingFactFormSchema,
  type RatingFactFormValues,
} from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { useRecordFactIntentScope } from '../model/record-fact-intent-scope'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function CheckpointRatingForm({
  canMutate,
  canRetry,
  checkpointId,
  isOnline,
  label,
  maximum,
  minimum,
  refetch,
  target,
}: Readonly<{
  canMutate: boolean
  canRetry: boolean
  checkpointId: string
  isOnline: boolean
  label: string
  maximum?: number
  minimum?: number
  refetch: () => Promise<unknown>
  target: FactTarget
}>) {
  const lowerBound = minimum ?? Number.MIN_SAFE_INTEGER
  const upperBound = maximum ?? Number.MAX_SAFE_INTEGER
  const schema = createRatingFactFormSchema(lowerBound, upperBound)
  const form = useZodForm(schema, { defaultValues: { value: '' } })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeCheckpointFact,
    mapValues: (values: RatingFactFormValues) =>
      mapCheckpointFact(checkpointId, values, target, 'rating', {
        maximum: upperBound,
        minimum: lowerBound,
      }),
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
        label={
          minimum === undefined || maximum === undefined
            ? label
            : `${label} (${minimum}–${maximum})`
        }
        type="text"
        inputMode="numeric"
        step={1}
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
