import { useZodForm } from '@/shared/lib/form'
import { scalarFactControllerRecordRating } from '@/shared/api'
import { Button, TextField } from '@/shared/ui'

import {
  finalizeRatingFact,
  mapRatingFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import { createRatingFactFormSchema } from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
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
    mapValues: (values: { value: string | number }) => {
      return mapRatingFact(values, target, minimum, maximum)
    },
    refetch,
    send: (body) => scalarFactControllerRecordRating(body),
  })
  const error = form.formState.errors.value?.message

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
        disabled={intent.status === 'pending' || !isOnline}
        error={error}
        {...form.register('value')}
      />
      <Button
        type="submit"
        size="sm"
        disabled={!isOnline}
        isLoading={
          intent.status === 'pending' || intent.status === 'reconciling'
        }
        loadingLabel="Сохраняем"
      >
        Записать
      </Button>
      <RecordFactFormFeedback
        isOnline={isOnline}
        onRetry={() => void intent.retry(isOnline)}
        status={intent.status}
      />
    </form>
  )
}
