import { useZodForm } from '@/shared/lib/form'
import {
  CompositeFactControllerRecordText422Response,
  compositeFactControllerRecordText,
} from '@/shared/api'
import { Button, Field, FieldLabel, TextareaField } from '@/shared/ui'

import {
  finalizeTextFact,
  mapTextFact,
  type FactTarget,
} from '../model/composite-fact-mappers'
import { textFactFormSchema } from '../model/composite-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { useRecordFactIntentScope } from '../model/record-fact-intent-scope'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function TextFactForm({
  checkpointId = null,
  isOnline,
  refetch,
  target,
  label = 'Текстовый факт',
}: Readonly<{
  checkpointId?: string | null
  isOnline: boolean
  label?: string
  refetch: () => Promise<unknown>
  target: FactTarget
}>) {
  const form = useZodForm(textFactFormSchema, {
    defaultValues: { result: 'done', text: '' },
  })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeTextFact,
    mapValues: (values: { result: 'done' | 'not_done'; text: string }) =>
      mapTextFact(values, target, checkpointId),
    refetch,
    send: (body) => compositeFactControllerRecordText(body),
  })
  useRecordFactIntentScope(intent.status, intent.abandon)
  const locked =
    intent.status === 'pending' ||
    intent.status === 'reconciling' ||
    intent.status === 'unknown' ||
    intent.isTerminal

  return (
    <form
      className="grid gap-2"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        void intent.submit(values, isOnline)
      })}
    >
      <TextareaField
        label={label}
        rows={2}
        disabled={locked || !isOnline}
        error={form.formState.errors.text?.message}
        {...form.register('text')}
      />
      <Field>
        <FieldLabel>Результат</FieldLabel>
        <div className="flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              value="done"
              disabled={locked || !isOnline}
              {...form.register('result')}
            />
            Выполнено
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              value="not_done"
              disabled={locked || !isOnline}
              {...form.register('result')}
            />
            Не выполнено
          </label>
        </div>
      </Field>
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
          '/checkpointId',
          '/expectationDate',
          '/planGoalSnapshotId',
          '/publicationId',
          '/result',
          '/text',
        ]}
        error={intent.error}
        isOnline={isOnline}
        onAbandon={intent.abandon}
        onRetry={() => void intent.retry(isOnline)}
        problemSchema={CompositeFactControllerRecordText422Response}
        status={intent.status}
      />
    </form>
  )
}
