import { describe, expect, it } from 'vitest'

import {
  exactDecimalStringSchema,
  formatProductDateLabel,
  formatProductInstant,
  getProductDateParts,
  localTimeSchema,
  productDateSchema,
  productInstantSchema,
  productMonthSchema,
  revisionStringSchema,
  toProductCalendarDate,
} from './canonical-values'

describe('canonical Planner values', () => {
  it('accepts exact month, date, time, revision, and decimal strings', () => {
    expect(productMonthSchema.parse('2026-08')).toBe('2026-08')
    expect(productDateSchema.parse('2028-02-29')).toBe('2028-02-29')
    expect(localTimeSchema.parse('23:59')).toBe('23:59')
    expect(revisionStringSchema.parse('9007199254740993')).toBe(
      '9007199254740993',
    )
    expect(exactDecimalStringSchema.parse('-1200.050')).toBe('-1200.050')
  })

  it('rejects normalized, impossible, or lossy representations', () => {
    expect(productMonthSchema.safeParse('2026-8').success).toBe(false)
    expect(productDateSchema.safeParse('2026-02-29').success).toBe(false)
    expect(localTimeSchema.safeParse('24:00').success).toBe(false)
    expect(revisionStringSchema.safeParse('01').success).toBe(false)
    expect(exactDecimalStringSchema.safeParse('1e3').success).toBe(false)
  })

  it('returns calendar parts without parsing the wire value as an instant', () => {
    expect(getProductDateParts(productDateSchema.parse('2026-08-30'))).toEqual({
      year: 2026,
      month: 8,
      day: 30,
    })
  })

  it('creates and labels a calendar date in the explicit product timezone', () => {
    const value = productDateSchema.parse('2026-08-30')
    const date = toProductCalendarDate(value)

    expect(date.timeZone).toBe('Asia/Yekaterinburg')
    expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([
      2026, 8, 30,
    ])
    expect(formatProductDateLabel(value)).toBe('30 августа 2026')
  })

  it('formats instants in Planner time rather than the browser timezone', () => {
    const instant = productInstantSchema.parse('2026-08-29T20:30:00Z')

    expect(formatProductInstant(instant)).toBe('30 августа 2026, 01:30')
  })
})
