import axios from 'axios'

import type { CsrfTokenResponseDto } from '../generated/model/csrfTokenResponseDto'
import { getOrFetchCsrfTokenLease } from './csrf-token'

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const clientDefaults = {
  baseURL: '/api',
  withCredentials: true,
}

export const API_AXIOS_INSTANCE = axios.create(clientDefaults)
const csrfAxios = axios.create(clientDefaults)

async function fetchCsrfToken() {
  const response = await csrfAxios.get<CsrfTokenResponseDto>('/auth/csrf')
  return response.data.csrfToken
}

API_AXIOS_INSTANCE.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase() ?? 'GET'
  if (!unsafeMethods.has(method)) return config

  config.headers.set('Content-Type', 'application/json')
  if (config.data === undefined) config.data = {}
  const csrfTokenLease = await getOrFetchCsrfTokenLease(fetchCsrfToken)
  const requestSignal = config.signal as AbortSignal | undefined
  config.signal = requestSignal
    ? AbortSignal.any([requestSignal, csrfTokenLease.signal])
    : csrfTokenLease.signal
  config.headers.set('X-CSRF-Token', csrfTokenLease.read())
  return config
})
