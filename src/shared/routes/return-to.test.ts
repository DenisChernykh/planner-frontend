import { describe, expect, it } from 'vitest'

import { consumeReturnTo, sanitizeReturnTo, storeReturnTo } from './return-to'

describe('Planner returnTo', () => {
  it.each([
    '/',
    '/today',
    '/months/2026-08',
    '/months/2026-08/days/2026-08-30',
    '/plans',
    '/plans/new',
    '/plans/2026-09/edit',
    '/plans/2026-09/preview',
    '/plans/catalog/goals/v1.2',
    '/statistics/2026-08',
    '/settings',
  ])('accepts protected pathname %s', (pathname) => {
    expect(sanitizeReturnTo(pathname)).toBe(pathname)
  })

  it.each([
    'https://example.com/today',
    '//example.com',
    '/today?dialog=close-day',
    '/today#fact',
    '/login',
    '/auth/telegram/result',
    '/auth/telegram/start',
    '/admin/accounts',
  ])('rejects unsafe target %s', (target) => {
    expect(sanitizeReturnTo(target)).toBeNull()
  })

  it.each([
    '/plans/../auth/telegram/start',
    '/plans/./new',
    '/plans/%2e%2e/auth/telegram/start',
    '/plans/%2E./auth/telegram/start',
    '/plans/.%2e/auth/telegram/start',
    '/plans/%252e%252e/auth/telegram/start',
    '/plans/new%2F..%2Fauth/telegram/start',
    '/plans/new%5c..%5cauth/telegram/start',
    '/plans/%E0%A4%A',
    String.raw`/plans\..\auth\telegram\start`,
    '/plans/\t../auth/telegram/start',
  ])('rejects ambiguous or browser-normalized pathname %s', (target) => {
    expect(sanitizeReturnTo(target)).toBeNull()
  })

  it('stores a safe pathname and consumes it exactly once', () => {
    expect(storeReturnTo(sessionStorage, '/plans/new')).toBe(true)
    expect(consumeReturnTo(sessionStorage)).toBe('/plans/new')
    expect(consumeReturnTo(sessionStorage)).toBeNull()
  })

  it('drops invalid or oversized values', () => {
    sessionStorage.setItem('planner.return-to.v1', `/${'a'.repeat(2048)}`)
    expect(consumeReturnTo(sessionStorage)).toBeNull()
    expect(storeReturnTo(sessionStorage, '/login')).toBe(false)
  })
})
