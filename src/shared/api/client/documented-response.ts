import type { AxiosResponse } from 'axios'

import { ApiDocumentedResponseError, ApiProtocolError } from './api-errors'
import { GENERATED_API_RESPONSE_CONTRACTS } from '../generated-zod/response-contracts'

function compilePath(path: string) {
  const source = path
    .split(/(\{[^{}]+\})/u)
    .map((part) =>
      part.startsWith('{')
        ? '[^/]+'
        : part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'),
    )
    .join('')
  return new RegExp(`^${source}$`, 'u')
}

const contracts = GENERATED_API_RESPONSE_CONTRACTS.map((contract) => ({
  ...contract,
  pathPattern: compilePath(contract.path),
}))

function mediaType(response: AxiosResponse<unknown>) {
  return String(response.headers['content-type'] ?? '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase()
}

function requestId(response: AxiosResponse<unknown>) {
  const value = response.headers['x-request-id']
  return typeof value === 'string' && value.length > 0 ? value : null
}

function requestPath(url: string) {
  try {
    return new URL(url, 'https://planner.invalid').pathname
  } catch {
    return ''
  }
}

/**
 * Preserves documented non-success response handling without validating
 * successful operation payloads. Successful payloads are trusted at the
 * generated TypeScript boundary in the transport mutator.
 */
export async function parseDocumentedApiErrorResponse(
  response: AxiosResponse<unknown>,
): Promise<ApiDocumentedResponseError | null> {
  const method = response.config.method?.toUpperCase() ?? 'GET'
  const path = requestPath(response.config.url ?? '')
  const contract = contracts.find(
    (candidate) =>
      candidate.method === method && candidate.pathPattern.test(path),
  )
  const expected = contract?.responses.find(
    (candidate) =>
      candidate.status === response.status &&
      candidate.outcome === 'documented-error',
  )

  if (
    expected === undefined ||
    expected.mediaType === null ||
    mediaType(response) !== expected.mediaType
  ) {
    return null
  }

  const schema = await expected.loadSchema()
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) throw new ApiProtocolError(requestId(response))

  return new ApiDocumentedResponseError(
    response.status,
    parsed.data,
    requestId(response),
  )
}
