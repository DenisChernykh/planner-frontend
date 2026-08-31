import { OPENAPI_CONTRACT_SOURCE, type HealthLive200 } from '@/shared/api'

const healthLiveResponse = {
  status: 'ok',
} as const satisfies HealthLive200

/** Minimal MSW fixture tied to the exact pinned backend artifact. */
export const healthLiveFixture = Object.freeze({
  contract: OPENAPI_CONTRACT_SOURCE,
  response: healthLiveResponse,
})
