/**
 * Generated from openapi/openapi.json by scripts/openapi/generate-runtime-contract.mjs.
 * Do not edit manually.
 */
import { z } from 'zod'

export const TELEGRAM_OIDC_RESULT_CODES = [
  'success',
  'cancelled',
  'login_rejected',
  'access_denied',
  'dependency_unavailable',
  'invalid_callback',
] as const

export type TelegramOidcResultCode = (typeof TELEGRAM_OIDC_RESULT_CODES)[number]

export const TelegramOidcResultCodeSchema = z.enum(TELEGRAM_OIDC_RESULT_CODES)
