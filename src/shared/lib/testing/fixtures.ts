import { HealthLive200Response } from '@/shared/api/generated-zod/health/health.zod'
import { OPENAPI_CONTRACT_SOURCE } from '@/shared/api/generated-zod/contract-source'
import type { HealthLive200 } from '@/shared/api/generated/model'

const healthLiveResponse = {
  status: 'ok',
} as const satisfies HealthLive200

/** Minimal MSW fixture tied to the exact pinned backend artifact. */
export const healthLiveFixture = Object.freeze({
  contract: OPENAPI_CONTRACT_SOURCE,
  response: HealthLive200Response.parse(healthLiveResponse),
})
