import { useZodForm } from '@/shared/lib/form'
import {
  ScalarFactControllerRecordFact422Response,
  scalarFactControllerRecordFact,
} from '@/shared/api'
import { Button, TextField } from '@/shared/ui'

import {
  finalizeQuantityFact,
  mapQuantityFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import { createQuantityFactFormSchema } from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { useRecordFactIntentScope } from '../model/record-fact-intent-scope'
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
        className="min-w-28 flex-1"
        label={`${aggregation === 'add' ? 'Добавить' : 'Последнее значение'} (${unit})`}
        inputMode="decimal"
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
          '/localDate',
          '/planGoalSnapshotId',
          '/publicationId',
          '/value',
          '/value/kind',
          '/value/value',
        ]}
        error={intent.error}
        isOnline={isOnline}
        onAbandon={intent.abandon}
        onRetry={() => void intent.retry(isOnline)}
        problemSchema={ScalarFactControllerRecordFact422Response}
        status={intent.status}
      />
    </form>
  )
}
