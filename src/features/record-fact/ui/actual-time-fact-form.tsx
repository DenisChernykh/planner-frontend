import { useZodForm } from '@/shared/lib/form'
import { scalarFactControllerRecordTime } from '@/shared/api'
import { Button, TextField } from '@/shared/ui'

import {
  finalizeTimeFact,
  mapTimeFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import { actualTimeFactFormSchema } from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function ActualTimeFactForm({
  target,
  isOnline,
  refetch,
  start,
  end,
  label = 'Фактическое время',
}: Readonly<{
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
        className="min-w-28 flex-1"
        label={`${label} (${start}–${end})`}
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
