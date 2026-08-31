import { useZodForm } from '@/shared/lib/form'
import {
  ScalarFactControllerRecordRating422Response,
  scalarFactControllerRecordRating,
} from '@/shared/api'
import { Button, TextField } from '@/shared/ui'

import {
  finalizeRatingFact,
  mapRatingFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import {
  createRatingFactFormSchema,
  type RatingFactFormValues,
} from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { useRecordFactIntentScope } from '../model/record-fact-intent-scope'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function RatingFactForm({
  target,
  isOnline,
  refetch,
  minimum,
  maximum,
  label = 'Оценка',
}: Readonly<{
  isOnline: boolean
  label?: string
  maximum: number
  minimum: number
  refetch: () => Promise<unknown>
  target: FactTarget
}>) {
  const schema = createRatingFactFormSchema(minimum, maximum)
  const form = useZodForm(schema, { defaultValues: { value: '' } })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeRatingFact,
    mapValues: (values: RatingFactFormValues) => {
      return mapRatingFact(values, target, minimum, maximum)
    },
    refetch,
    send: (body) => scalarFactControllerRecordRating(body),
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
        void intent.submit(values, isOnline)
      })}
    >
      <TextField
        className="min-w-24 flex-1"
        label={`${label} (${minimum}–${maximum})`}
        type="text"
        inputMode="numeric"
        step={1}
        disabled={locked || !isOnline}
        error={error}
        {...form.register('value')}
      />
      {isOnline && (
        <Button
          type="submit"
          size="sm"
          disabled={locked || !isOnline}
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
        onAbandon={intent.abandon}
        onRetry={() => void intent.retry(isOnline)}
        problemSchema={ScalarFactControllerRecordRating422Response}
        status={intent.status}
      />
    </form>
  )
}
