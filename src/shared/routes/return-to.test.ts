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
    '/plans/2026-09/goals/new',
    '/plans/catalog',
    '/plans/catalog/new',
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
    '/plans/private-user@example.com',
    '/plans/token/raw-secret',
    '/plans/catalog/not-a-uuid',
    '/plans/2026-09/goals/11111111-1111-4111-8111-111111111111/edit',
    '/plans/catalog/11111111-1111-4111-8111-111111111111',
    '/plans/catalog/11111111-1111-4111-8111-111111111111/new-version',
    '/months/0000-01',
    '/plans/0000-01/edit',
    '/statistics/0000-01',
    '/months/2026-02/days/2026-02-29',
    '/months/2024-02/days/2024-02-30',
    '/months/2026-08/days/2026-09-01',
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
