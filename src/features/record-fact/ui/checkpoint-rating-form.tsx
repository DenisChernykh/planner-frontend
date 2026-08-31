import { scalarFactControllerRecordCheckpoint } from '@/shared/api'
import { useZodForm } from '@/shared/lib/form'
import { Button, TextField } from '@/shared/ui'

import {
  finalizeCheckpointFact,
  mapCheckpointFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import { createRatingFactFormSchema } from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function CheckpointRatingForm({
  checkpointId,
  isOnline,
  label,
  maximum,
  minimum,
  refetch,
  target,
}: Readonly<{
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
    mapValues: (values: { value: string | number }) =>
      mapCheckpointFact(checkpointId, values, target, 'rating', {
        maximum: upperBound,
        minimum: lowerBound,
      }),
    refetch,
    send: (body) => scalarFactControllerRecordCheckpoint(body),
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
        label={
          minimum === undefined || maximum === undefined
            ? label
            : `${label} (${minimum}–${maximum})`
        }
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
