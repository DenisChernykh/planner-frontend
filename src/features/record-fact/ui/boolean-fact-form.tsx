import { useZodForm } from '@/shared/lib/form'
import { scalarFactControllerRecordFact } from '@/shared/api'
import { Button, Field, FieldLabel } from '@/shared/ui'

import {
  finalizeBooleanFact,
  mapBooleanFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import { booleanFactFormSchema } from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function BooleanFactForm({
  target,
  isOnline,
  refetch,
  label = 'Состояние',
}: Readonly<{
  isOnline: boolean
  label?: string
  refetch: () => Promise<unknown>
  target: FactTarget
}>) {
  const form = useZodForm(booleanFactFormSchema, {
    defaultValues: { result: 'done' },
  })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeBooleanFact,
    mapValues: (values: { result: 'done' | 'not_done' }) =>
      mapBooleanFact(values, target),
    refetch,
    send: (body) => scalarFactControllerRecordFact(body),
  })

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        void intent.submit(values, isOnline)
      })}
    >
      <Field className="min-w-36 flex-1">
        <FieldLabel>{label}</FieldLabel>
        <div className="flex h-8 items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              value="done"
              disabled={intent.status === 'pending' || !isOnline}
              {...form.register('result')}
            />
            Выполнено
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              value="not_done"
              disabled={intent.status === 'pending' || !isOnline}
              {...form.register('result')}
            />
            Не выполнено
          </label>
        </div>
      </Field>
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
