import { z } from 'zod'

const clockPattern = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/
const decimalPattern = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/

export const booleanFactFormSchema = z.strictObject({
  result: z.enum(['done', 'not_done']),
})

export function createQuantityFactFormSchema(precision: number) {
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

export const actualTimeFactFormSchema = z.strictObject({
  value: z.string().regex(clockPattern, 'Введите время в формате ЧЧ:ММ'),
})

export function createRatingFactFormSchema(minimum: number, maximum: number) {
  return z.strictObject({
    value: z
      .string()
      .regex(/^-?[0-9]+$/, 'Введите целое число')
      .refine((value) => {
        const numericValue = Number(value)
        return (
          Number.isSafeInteger(numericValue) &&
          numericValue >= minimum &&
          numericValue <= maximum
        )
      }, `Введите число от ${minimum} до ${maximum}`)
      .transform(Number),
  })
}

export type BooleanFactFormValues = z.input<typeof booleanFactFormSchema>
export type ActualTimeFactFormValues = z.input<typeof actualTimeFactFormSchema>
export type QuantityFactFormValues = z.input<
  ReturnType<typeof createQuantityFactFormSchema>
>
export type RatingFactFormValues =
  | z.input<ReturnType<typeof createRatingFactFormSchema>>
  | z.output<ReturnType<typeof createRatingFactFormSchema>>
