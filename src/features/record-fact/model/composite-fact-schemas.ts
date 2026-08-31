import { z } from 'zod'

export const textFactFormSchema = z.strictObject({
  result: z.enum(['done', 'not_done']),
  text: z.string().min(1, 'Введите текст'),
})

export const checklistItemFactFormSchema = z.strictObject({
  state: z.enum(['done', 'not_done']),
})

const decimalPattern = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/

export function createOrVariantFactFormSchema(precision: number) {
  return z.strictObject({
    value: z
      .string()
      .regex(decimalPattern, 'Введите неотрицательное число')
      .refine(
        (value) => (value.split('.')[1]?.length ?? 0) <= precision,
        `Допустимо знаков после запятой: ${precision}`,
      ),
  })
}

export type TextFactFormValues = z.input<typeof textFactFormSchema>
export type ChecklistItemFactFormValues = z.input<
  typeof checklistItemFactFormSchema
>
export type OrVariantFactFormValues = z.input<
  ReturnType<typeof createOrVariantFactFormSchema>
>
