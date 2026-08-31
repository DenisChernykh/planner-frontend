import { scalarFactControllerRecordCheckpoint } from '@/shared/api'
import { useZodForm } from '@/shared/lib/form'
import { Button, TextField } from '@/shared/ui'

import {
  finalizeCheckpointFact,
  mapCheckpointFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import { actualTimeFactFormSchema } from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function CheckpointTimeForm({
  checkpointId,
  isOnline,
  label,
  refetch,
  target,
}: Readonly<{
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
        label={label}
        type="time"
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
