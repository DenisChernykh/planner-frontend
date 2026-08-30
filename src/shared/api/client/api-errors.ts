import axios from 'axios'
import { z } from 'zod'

import {
  GENERATED_PROBLEM_CODES,
  type GeneratedProblemCode,
} from '../generated-zod/problem-codes'

const problemDocumentSchema = z
  .object({
    type: z.url(),
    title: z.string(),
    status: z.number().int().min(400).max(599),
    detail: z.string(),
    instance: z.string(),
    code: z.enum(GENERATED_PROBLEM_CODES),
    requestId: z.string(),
    errors: z.unknown().optional(),
    conflict: z.unknown().optional(),
    blockers: z.unknown().optional(),
  })
  .strip()

export type ProblemDocumentLike = z.infer<typeof problemDocumentSchema>
export type ProblemCode = GeneratedProblemCode

export class ApiProblemError<
  TProblem extends ProblemDocumentLike = ProblemDocumentLike,
> extends Error {
  public readonly name = 'ApiProblemError'
  public readonly problem: TProblem
  public readonly retryAfterMs: number | null

  public constructor(problem: TProblem, retryAfterMs: number | null) {
    super('The API rejected the request')
    this.problem = problem
    this.retryAfterMs = retryAfterMs
  }

  public get status() {
    return this.problem.status
  }

  public get code() {
    return this.problem.code
  }

  public get requestId() {
    return this.problem.requestId
  }
}

export class ApiAbortError extends Error {
  public readonly name = 'ApiAbortError'

  public constructor() {
    super('The API request was aborted')
  }
}

export class ApiNetworkError extends Error {
  public readonly name = 'ApiNetworkError'

  public constructor() {
    super('The API could not be reached')
  }
}

export class ApiProtocolError extends Error {
  public readonly name = 'ApiProtocolError'
  public readonly requestId: string | null

  public constructor(requestId: string | null = null) {
    super('The API returned a response outside the published contract')
    this.requestId = requestId
  }
}

export class ApiDocumentedResponseError<TBody = unknown> extends Error {
  public readonly name = 'ApiDocumentedResponseError'
  public readonly status: number
  public readonly body: TBody
  public readonly requestId: string | null

  public constructor(status: number, body: TBody, requestId: string | null) {
    super('The API returned a documented non-success response')
    this.status = status
    this.body = body
    this.requestId = requestId
  }
}

type DocumentedResponseBranch<TDocumentedBody> = [
  Exclude<TDocumentedBody, null | void>,
] extends [never]
  ? never
  : ApiDocumentedResponseError<Exclude<TDocumentedBody, null | void>>

export type ApiClientError<TDocumentedBody = never> =
  | ApiAbortError
  | DocumentedResponseBranch<TDocumentedBody>
  | ApiNetworkError
  | ApiProblemError
  | ApiProtocolError

function parseRetryAfter(value: unknown, now: number): number | null {
  if (typeof value !== 'string') return null
  const retryAfter = value.trim()

  if (/^\d+$/u.test(retryAfter)) {
    const milliseconds = Number(retryAfter) * 1_000
    return Number.isSafeInteger(milliseconds) ? milliseconds : null
  }

  const retryAt = Date.parse(retryAfter)
  if (Number.isNaN(retryAt) || retryAt <= now) return null
  return retryAt - now
}

function isAbort(error: unknown) {
  return (
    axios.isCancel(error) ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError')
  )
}

export function normalizeApiError(
  error: unknown,
  now = Date.now(),
): ApiClientError<unknown> {
  if (
    error instanceof ApiAbortError ||
    error instanceof ApiDocumentedResponseError ||
    error instanceof ApiNetworkError ||
    error instanceof ApiProblemError ||
    error instanceof ApiProtocolError
  ) {
    return error
  }
  if (isAbort(error)) return new ApiAbortError()
  if (!axios.isAxiosError(error)) return new ApiProtocolError()
  if (error.response === undefined) return new ApiNetworkError()

  const mediaType = String(error.response.headers['content-type'] ?? '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase()
  if (mediaType !== 'application/problem+json') {
    return new ApiProtocolError()
  }

  const parsed = problemDocumentSchema.safeParse(error.response.data)
  if (!parsed.success || parsed.data.status !== error.response.status) {
    return new ApiProtocolError(parsed.success ? parsed.data.requestId : null)
  }

  return new ApiProblemError(
    parsed.data,
    parseRetryAfter(error.response.headers['retry-after'], now),
  )
}

/** Валидирует Problem extension схемой конкретной operation перед чтением. */
export function validateApiProblem<TProblem extends ProblemDocumentLike>(
  error: ApiProblemError,
  schema: z.ZodType<TProblem>,
): ApiProblemError<TProblem> {
  const parsed = schema.safeParse(error.problem)
  if (!parsed.success) throw new ApiProtocolError(error.requestId)
  return new ApiProblemError(parsed.data, error.retryAfterMs)
}

export function isProblemCode<TCode extends ProblemCode>(
  error: unknown,
  code: TCode,
): error is ApiProblemError<ProblemDocumentLike & { code: TCode }> {
  return error instanceof ApiProblemError && error.code === code
}
