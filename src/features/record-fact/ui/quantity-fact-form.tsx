import { useZodForm } from '@/shared/lib/form'
import { scalarFactControllerRecordFact } from '@/shared/api'
import { Button, TextField } from '@/shared/ui'

import {
  finalizeQuantityFact,
  mapQuantityFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import { createQuantityFactFormSchema } from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function QuantityFactForm({
  target,
  isOnline,
  refetch,
  precision,
  aggregation,
  unit,
}: Readonly<{
  aggregation: 'add' | 'latest'
  isOnline: boolean
  precision: number
  refetch: () => Promise<unknown>
  target: FactTarget
  unit: string
}>) {
  const schema = createQuantityFactFormSchema(precision)
  const form = useZodForm(schema, { defaultValues: { value: '' } })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeQuantityFact,
    mapValues: (values: { value: string }) =>
      mapQuantityFact(values, target, precision),
    refetch,
    send: (body) => scalarFactControllerRecordFact(body),
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
        label={`${aggregation === 'add' ? 'Добавить' : 'Последнее значение'} (${unit})`}
        inputMode="decimal"
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
