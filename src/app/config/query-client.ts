import { QueryClient } from '@tanstack/react-query'

import {
  ApiDocumentedResponseError,
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
} from '@/shared/api'

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ERR_CANCELED')
  )
}

/**
 * Ограничивает автоматические повторы безопасных чтений.
 *
 * @remarks Network failures, валидные server Problems и документированные
 * non-success ответы `5xx` получают не более двух повторов. Отмена, protocol
 * failure и `4xx` всегда завершаются сразу.
 */
export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (
    failureCount >= 2 ||
    isAbortError(error) ||
    error instanceof ApiProtocolError
  ) {
    return false
  }

  if (error instanceof ApiNetworkError) return true
  return (
    (error instanceof ApiProblemError ||
      error instanceof ApiDocumentedResponseError) &&
    error.status >= 500
  )
}

/** Создаёт изолированный QueryClient для приложения или теста. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
        networkMode: 'always',
      },
    },
  })
}

/** Единственный QueryClient текущего browser principal. */
export const queryClient = createQueryClient()
