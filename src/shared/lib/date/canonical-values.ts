import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { z } from 'zod'

export const PRODUCT_TIME_ZONE = 'Asia/Yekaterinburg'

const monthPattern = /^(?<year>\d{4})-(?<month>0[1-9]|1[0-2])$/u
const datePattern =
  /^(?<year>\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\d|3[01])$/u
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/u
const unsignedIntegerPattern = /^(?:0|[1-9]\d*)$/u
const decimalPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isCanonicalProductDate(value: string) {
  const match = datePattern.exec(value)
  if (match?.groups === undefined) return false

  const year = Number(match.groups.year)
  const month = Number(match.groups.month)
  const day = Number(match.groups.day)
  return day <= daysInMonth(year, month)
}

/** Канонический месяц transport/model boundary (`YYYY-MM`). */
export const productMonthSchema = z.string().regex(monthPattern)

/** Каноническая product date без неявной UTC-интерпретации. */
export const productDateSchema = z
  .string()
  .regex(datePattern)
  .refine(isCanonicalProductDate, 'Invalid calendar date')

/** Локальное время продукта (`HH:mm`), не instant. */
export const localTimeSchema = z.string().regex(timePattern)

/** ISO instant with an explicit UTC or numeric offset. */
export const productInstantSchema = z.iso.datetime({ offset: true })

/** Lossless revision/counter/bigint в десятичной строке. */
export const revisionStringSchema = z.string().regex(unsignedIntegerPattern)

/** Lossless decimal без exponent notation. */
export const exactDecimalStringSchema = z.string().regex(decimalPattern)

export type ProductMonth = z.infer<typeof productMonthSchema>
export type ProductDate = z.infer<typeof productDateSchema>
export type LocalTime = z.infer<typeof localTimeSchema>
export type ProductInstant = z.infer<typeof productInstantSchema>
export type RevisionString = z.infer<typeof revisionStringSchema>
export type ExactDecimalString = z.infer<typeof exactDecimalStringSchema>

/** Разбирает product date в calendar parts, не создавая `Date` из ISO-строки. */
export function getProductDateParts(value: ProductDate) {
  const match = datePattern.exec(value)
  if (match?.groups === undefined) throw new Error('Expected canonical date')

  return {
    year: Number(match.groups.year),
    month: Number(match.groups.month),
    day: Number(match.groups.day),
  } as const
}

/** Creates a calendar date in the explicit product timezone, never from ISO date parsing. */
export function toProductCalendarDate(value: ProductDate) {
  const { year, month, day } = getProductDateParts(value)
  return new TZDate(year, month - 1, day, PRODUCT_TIME_ZONE)
}

/** Formats a canonical date with Russian labels without changing its wire value. */
export function formatProductDateLabel(
  value: ProductDate,
  pattern = 'd MMMM yyyy',
) {
  return format(toProductCalendarDate(value), pattern, { locale: ru })
}

/** Formats an instant in Planner time, independently of the browser timezone. */
export function formatProductInstant(
  value: ProductInstant,
  pattern = 'd MMMM yyyy, HH:mm',
) {
  return format(new TZDate(value, PRODUCT_TIME_ZONE), pattern, { locale: ru })
}
