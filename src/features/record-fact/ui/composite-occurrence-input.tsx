import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormReturn,
} from 'react-hook-form'

import { TextField } from '@/shared/ui'

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
  canMutate: boolean
  form: Pick<UseFormReturn<TValues>, 'formState' | 'register'>
  locked: boolean
}>

export function CompositeOccurrenceInput<TValues extends FieldValues>({
  component,
  canMutate,
  form,
  locked,
}: OccurrenceInputProps<TValues>) {
  const errors = form.formState.errors as FieldErrors<OccurrenceFormValues>

  if (component.kind === 'or_variant') {
    const valueError = 'value' in errors ? errors.value?.message : undefined
    return (
      <TextField
        className="min-w-28 flex-1"
        label={`${component.label} (${component.unit})`}
        inputMode="decimal"
        disabled={locked || !canMutate}
        error={valueError}
        {...form.register('value' as Path<TValues>)}
      />
    )
  }

  return (
    <fieldset className="min-w-36 flex-1">
      <legend className="text-xs font-medium">{component.label}</legend>
      <div className="flex h-8 items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            value="done"
            disabled={locked || !canMutate}
            {...form.register('state' as Path<TValues>)}
          />
          Выполнено
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            value="not_done"
            disabled={locked || !canMutate}
            {...form.register('state' as Path<TValues>)}
          />
          Не выполнено
        </label>
      </div>
    </fieldset>
  )
}
