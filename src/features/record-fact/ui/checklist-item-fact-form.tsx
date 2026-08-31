import { useZodForm } from '@/shared/lib/form'
import {
  CompositeFactControllerRecordChecklistItem422Response,
  compositeFactControllerRecordChecklistItem,
} from '@/shared/api'
import { Button, Field, FieldLabel } from '@/shared/ui'

import {
  finalizeChecklistItemFact,
  mapChecklistItemFact,
} from '../model/composite-fact-mappers'
import { checklistItemFactFormSchema } from '../model/composite-fact-schemas'
import type { FactTarget } from '../model/record-fact-mappers'
import { useRecordFactIntent } from '../model/use-record-fact-intent'
import { useRecordFactIntentScope } from '../model/record-fact-intent-scope'
import { RecordFactFormFeedback } from './record-fact-form-feedback'

export function ChecklistItemFactForm({
  checkpointId = null,
  itemId,
  isOnline,
  label,
  refetch,
  target,
}: Readonly<{
  checkpointId?: string | null
  isOnline: boolean
  itemId: string
  label: string
  refetch: () => Promise<unknown>
  target: FactTarget
}>) {
  const form = useZodForm(checklistItemFactFormSchema, {
    defaultValues: { state: 'done' },
  })
  const intent = useRecordFactIntent({
    finalizePayload: finalizeChecklistItemFact,
    mapValues: (values: { state: 'done' | 'not_done' }) =>
      mapChecklistItemFact(values, target, itemId, checkpointId),
    refetch,
    send: (body) => compositeFactControllerRecordChecklistItem(body),
  })
  useRecordFactIntentScope(intent.status, intent.abandon)
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
      <Field className="min-w-36 flex-1">
        <FieldLabel>{label}</FieldLabel>
        <div className="flex h-8 items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              value="done"
              disabled={locked || !isOnline}
              {...form.register('state')}
            />
            Выполнено
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              value="not_done"
              disabled={locked || !isOnline}
              {...form.register('state')}
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
          '/checklistItemId',
          '/expectationDate',
          '/planGoalSnapshotId',
          '/publicationId',
          '/state',
        ]}
        error={intent.error}
        isOnline={isOnline}
        onAbandon={intent.abandon}
        onRetry={() => void intent.retry(isOnline)}
        problemSchema={CompositeFactControllerRecordChecklistItem422Response}
        status={intent.status}
      />
    </form>
  )
}
