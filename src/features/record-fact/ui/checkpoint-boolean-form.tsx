import { scalarFactControllerRecordCheckpoint } from '@/shared/api'
import { useZodForm } from '@/shared/lib/form'
import { Button } from '@/shared/ui'

import {
  finalizeCheckpointFact,
  mapCheckpointFact,
  type FactTarget,
} from '../model/record-fact-mappers'
import { booleanFactFormSchema } from '../model/record-fact-schemas'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function CheckpointBooleanForm({
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
  const form = useZodForm(booleanFactFormSchema, {
    defaultValues: { result: 'done' },
  })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeCheckpointFact,
    mapValues: (values: { result: 'done' | 'not_done' }) =>
      mapCheckpointFact(checkpointId, values, target, 'boolean'),
    refetch,
    send: (body) => scalarFactControllerRecordCheckpoint(body),
  })

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        void intent.submit(values, isOnline)
      })}
    >
      <fieldset className="flex min-w-36 flex-1 flex-wrap items-center gap-3">
        <legend className="w-full text-xs font-medium">{label}</legend>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="radio"
            value="done"
            disabled={intent.status === 'pending' || !isOnline}
            {...form.register('result')}
          />
          Выполнено
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="radio"
            value="not_done"
            disabled={intent.status === 'pending' || !isOnline}
            {...form.register('result')}
          />
          Не выполнено
        </label>
      </fieldset>
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
