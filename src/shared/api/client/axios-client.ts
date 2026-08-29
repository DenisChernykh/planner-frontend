import axios from 'axios'

import { getOrFetchCsrfToken } from './csrf-token'
import { parseSuccessfulApiResponse } from './success-response'

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const clientDefaults = {
  baseURL: '/api',
  withCredentials: true,
}

export const API_AXIOS_INSTANCE = axios.create(clientDefaults)
const csrfAxios = axios.create(clientDefaults)

async function fetchCsrfToken() {
  const response = await csrfAxios.get<unknown>('/auth/csrf')
  return parseSuccessfulApiResponse<{ csrfToken: string }>(response).csrfToken
}

API_AXIOS_INSTANCE.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase() ?? 'GET'
  if (!unsafeMethods.has(method)) return config

  config.headers.set('Content-Type', 'application/json')
  if (config.data === undefined) config.data = {}
  config.headers.set('X-CSRF-Token', await getOrFetchCsrfToken(fetchCsrfToken))
  return config
})
