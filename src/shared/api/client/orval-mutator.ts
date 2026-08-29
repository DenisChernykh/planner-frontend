import type { AxiosRequestConfig } from 'axios'

import {
  type ApiClientError,
  ApiProtocolError,
  normalizeApiError,
} from './api-errors'
import { API_AXIOS_INSTANCE } from './axios-client'
import { parseSuccessfulApiResponse } from './success-response'

// Orval's generated DTO union is documentation only at this boundary. The
// transport validates the safe base envelope; a feature must call
// validateApiProblem with its generated Zod schema before reading extensions.
export type ErrorType<GeneratedErrorData> = GeneratedErrorData extends unknown
  ? ApiClientError
  : never

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
    throw normalizeApiError(error)
  }
}
