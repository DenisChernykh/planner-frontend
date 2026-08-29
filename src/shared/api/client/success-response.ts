import type { AxiosResponse } from 'axios'

import { ApiProtocolError } from './api-errors'
import { GENERATED_SUCCESS_RESPONSE_CONTRACTS } from '../generated-zod/success-contracts'

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

const contracts = GENERATED_SUCCESS_RESPONSE_CONTRACTS.map((contract) => ({
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

export async function parseSuccessfulApiResponse<T>(
  response: AxiosResponse<unknown>,
): Promise<T> {
  const method = response.config.method?.toUpperCase() ?? 'GET'
  const path = requestPath(response.config.url ?? '')
  const contract = contracts.find(
    (candidate) =>
      candidate.method === method && candidate.pathPattern.test(path),
  )
  const expected = contract?.responses.find(
    (candidate) => candidate.status === response.status,
  )

  if (expected === undefined) {
    throw new ApiProtocolError(requestId(response))
  }

  if (expected.mediaType === null) {
    if (
      mediaType(response) !== '' ||
      !(
        response.data === undefined ||
        response.data === null ||
        response.data === ''
      )
    ) {
      throw new ApiProtocolError(requestId(response))
    }
    return undefined as T
  }

  if (mediaType(response) !== expected.mediaType) {
    throw new ApiProtocolError(requestId(response))
  }
  const schema = await expected.loadSchema()
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) throw new ApiProtocolError(requestId(response))
  return parsed.data as T
}
