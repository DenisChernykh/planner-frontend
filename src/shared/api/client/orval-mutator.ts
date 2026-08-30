import axios, { type AxiosRequestConfig } from 'axios'

import {
  type ApiClientError,
  ApiProtocolError,
  type ProblemDocumentLike,
  normalizeApiError,
} from './api-errors'
import { API_AXIOS_INSTANCE } from './axios-client'
import {
  parseDocumentedApiErrorResponse,
  parseSuccessfulApiResponse,
} from './success-response'

type DocumentedErrorData<GeneratedErrorData> =
  GeneratedErrorData extends ProblemDocumentLike | null | void
    ? never
    : GeneratedErrorData

// Problem Details and documented non-Problem responses have distinct runtime
// errors. A feature must still validate Problem extensions with its generated
// operation schema before reading them.
export type ErrorType<GeneratedErrorData> = ApiClientError<
  DocumentedErrorData<GeneratedErrorData>
>

export type BodyType<BodyData> = BodyData

type GeneratedApiRequestConfig = Readonly<
  Pick<
    AxiosRequestConfig,
    'data' | 'headers' | 'method' | 'params' | 'signal' | 'url'
  > & {
    method: NonNullable<AxiosRequestConfig['method']>
    url: string
  }
>

export type ApiRequestOptions = Readonly<{
  signal?: AbortSignal
}>

export async function apiMutator<T>(
  config: GeneratedApiRequestConfig,
  options?: ApiRequestOptions,
): Promise<T> {
  try {
    if (!/^\/(?![/\\])/u.test(config.url)) throw new ApiProtocolError()

    const response = await API_AXIOS_INSTANCE.request<unknown>({
      data: config.data,
      method: config.method,
      params: config.params,
      signal: config.signal ?? options?.signal,
      url: config.url,
      validateStatus: (status) => status >= 200 && status < 300,
    })
    return await parseSuccessfulApiResponse<T>(response)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response !== undefined) {
      let documentedError
      try {
        documentedError = await parseDocumentedApiErrorResponse(error.response)
      } catch (validationError) {
        throw normalizeApiError(validationError)
      }
      if (documentedError !== null) throw documentedError
    }
    throw normalizeApiError(error)
  }
}
