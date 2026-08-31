import { describe, expect, it } from 'vitest'

import { loginPathWithReturnTo } from './auth'

describe('Planner login route', () => {
  it('encodes an allowed protected pathname', () => {
    expect(loginPathWithReturnTo('/statistics/2026-08')).toBe(
      '/login?returnTo=%2Fstatistics%2F2026-08',
    )
  })

  it.each([
    '/today?raw=1',
    '/today#token',
    '/auth/telegram/start',
    'https://example.test/today',
  ])('drops unsafe returnTo %s', (returnTo) => {
    expect(loginPathWithReturnTo(returnTo)).toBe('/login')
  })
})
