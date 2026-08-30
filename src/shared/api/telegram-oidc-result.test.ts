import { describe, expect, it } from 'vitest'

import {
  TELEGRAM_OIDC_RESULT_CODES,
  TelegramOidcResultCodeSchema,
} from '@/shared/api'

describe('generated Telegram OIDC result contract', () => {
  it('exposes the backend-owned finite result allowlist', () => {
    expect(TELEGRAM_OIDC_RESULT_CODES).toEqual([
      'success',
      'cancelled',
      'login_rejected',
      'access_denied',
      'dependency_unavailable',
      'invalid_callback',
    ])

    for (const result of TELEGRAM_OIDC_RESULT_CODES) {
      expect(TelegramOidcResultCodeSchema.parse(result)).toBe(result)
    }
    expect(
      TelegramOidcResultCodeSchema.safeParse('provider_error').success,
    ).toBe(false)
  })
})
