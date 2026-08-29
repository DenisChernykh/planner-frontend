import { isRouteErrorResponse } from 'react-router'

import {
  ApiAbortError,
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
} from '@/shared/api'

export type RouteErrorPresentation = Readonly<{
  message: string
  requestId?: string
  retryable: boolean
}>

/** Maps transport and router failures to finite, safe Russian copy. */
export function getRouteErrorPresentation(
  error: unknown,
): RouteErrorPresentation {
  if (error instanceof ApiAbortError) {
    return { message: 'Загрузка страницы была прервана.', retryable: false }
  }

  if (error instanceof ApiNetworkError) {
    return {
      message: 'Не удалось подключиться к серверу.',
      retryable: true,
    }
  }

  if (error instanceof ApiProtocolError) {
    return {
      message: 'Сервер вернул ответ вне опубликованного контракта.',
      ...(error.requestId === null ? {} : { requestId: error.requestId }),
      retryable: false,
    }
  }

  if (error instanceof ApiProblemError) {
    if (error.status === 403) {
      return {
        message: 'Недостаточно прав для этой страницы.',
        retryable: false,
      }
    }
    if (error.status === 404) {
      return { message: 'Запрошенные данные не найдены.', retryable: false }
    }
    if (error.status === 429) {
      return {
        message: 'Слишком много запросов. Повторите попытку позже.',
        retryable: false,
      }
    }
    if (error.status >= 500) {
      return {
        message: 'Сервис временно недоступен.',
        requestId: error.requestId,
        retryable: true,
      }
    }

    return {
      message: 'Не удалось загрузить данные страницы.',
      requestId: error.requestId,
      retryable: false,
    }
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return { message: 'Страница не найдена.', retryable: false }
  }

  return {
    message: 'Произошла непредвиденная ошибка.',
    retryable: false,
  }
}
