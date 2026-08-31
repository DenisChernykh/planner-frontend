import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormReturn,
} from 'react-hook-form'

import { Field, FieldLabel, TextField } from '@/shared/ui'

import type {
  ChecklistItemFactFormValues,
  OrVariantFactFormValues,
} from '../model/composite-fact-schemas'

export type OccurrenceComponent =
  | Readonly<{ kind: 'checklist_item'; itemId: string; label: string }>
  | Readonly<{
      kind: 'or_variant'
      label: string
      precision: number
      unit: string
      variantId: string
    }>

type OccurrenceFormValues =
  ChecklistItemFactFormValues | OrVariantFactFormValues

type OccurrenceInputProps<TValues extends FieldValues> = Readonly<{
  component: OccurrenceComponent
  form: Pick<UseFormReturn<TValues>, 'formState' | 'register'>
  isOnline: boolean
  locked: boolean
}>

export function CompositeOccurrenceInput<TValues extends FieldValues>({
  component,
  form,
  isOnline,
  locked,
}: OccurrenceInputProps<TValues>) {
  const errors = form.formState.errors as FieldErrors<OccurrenceFormValues>

  if (component.kind === 'or_variant') {
    return (
      <TextField
        className="min-w-28 flex-1"
        label={`${component.label} (${component.unit})`}
        inputMode="decimal"
        disabled={locked || !isOnline}
        error={errors.value?.message}
        {...form.register('value' as Path<TValues>)}
      />
    )
  }

  return (
    <Field className="min-w-36 flex-1">
      <FieldLabel>{component.label}</FieldLabel>
      <div className="flex h-8 items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            value="done"
            disabled={locked || !isOnline}
            {...form.register('state' as Path<TValues>)}
          />
          Выполнено
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            value="not_done"
            disabled={locked || !isOnline}
            {...form.register('state' as Path<TValues>)}
          />
          Не выполнено
        </label>
      </div>
    </Field>
  )
}
