import { z } from 'zod'

import { ApiProblemError } from '@/shared/api'

const fieldLabels: Readonly<Record<string, string>> = {
  '/checkpointId': 'контрольная точка',
  '/checklistItemId': 'пункт списка',
  '/component': 'компонент',
  '/component/checklistItemId': 'пункт списка',
  '/component/kind': 'тип компонента',
  '/component/state': 'состояние',
  '/component/value': 'значение',
  '/component/variantId': 'вариант',
  '/expectationDate': 'дата ожидания',
  '/localDate': 'дата',
  '/planGoalSnapshotId': 'цель',
  '/publicationId': 'публикация',
  '/result': 'результат',
  '/state': 'состояние',
  '/text': 'текст',
  '/variantId': 'вариант',
  '/value': 'значение',
  '/value/kind': 'тип значения',
  '/value/result': 'результат',
  '/value/value': 'значение',
}

type ValidationProblem = Readonly<{
  code: 'VALIDATION_FAILED'
  errors: readonly Readonly<{ pointer: string }>[]
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidationProblem(value: unknown): value is ValidationProblem {
  return (
    isRecord(value) &&
    value.code === 'VALIDATION_FAILED' &&
    Array.isArray(value.errors) &&
    value.errors.every(
      (item): item is Readonly<{ pointer: string }> =>
        isRecord(item) && typeof item.pointer === 'string',
    )
  )
}

/** Formats only allowlisted validation pointers; problem details stay private. */
export function formatRecordFactError(
  error: unknown,
  allowedPointers: readonly string[] = [],
  problemSchema?: z.ZodType,
) {
  if (!(error instanceof ApiProblemError)) {
    return 'Не удалось сохранить значение. Проверьте соединение и данные.'
  }

  if (problemSchema === undefined) {
    return `Не удалось сохранить значение. Запрос: ${error.requestId}.`
  }
  const parsed = problemSchema.safeParse(error.problem)
  if (!parsed.success || !isValidationProblem(parsed.data)) {
    return `Не удалось сохранить значение. Запрос: ${error.requestId}.`
  }
  const errors = parsed.data.errors
  const fields = [
    ...new Set(
      errors
        .map((item) => item.pointer)
        .filter((pointer) => allowedPointers.includes(pointer))
        .map((pointer) => fieldLabels[pointer] ?? 'данные формы'),
    ),
  ]
  const suffix = ` Запрос: ${error.requestId}.`
  return fields.length > 0
    ? `Проверьте поля: ${fields.join(', ')}.${suffix}`
    : `Не удалось сохранить значение.${suffix}`
}
