import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'

import {
  ApiDocumentedResponseError,
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
  type ProblemCode,
} from '@/shared/api'

import { getRouteErrorPresentation } from './route-error-presentation'
import { RouteError } from './route-error'

function problem(status: number, code: ProblemCode, requestId: string) {
  return new ApiProblemError(
    {
      type: 'https://planner.example.test/problems/test',
      title: 'Raw backend title',
      status,
      detail: 'Raw backend detail',
      instance: `urn:request:${requestId}`,
      code,
      requestId,
    },
    null,
  )
}

describe('route error presentation', () => {
  it.each([
    [
      new ApiNetworkError(),
      { message: 'Не удалось подключиться к серверу.', retryable: true },
    ],
    [
      new ApiProtocolError('protocol-request'),
      {
        message: 'Сервер вернул ответ вне опубликованного контракта.',
        requestId: 'protocol-request',
        retryable: false,
      },
    ],
    [
      problem(503, 'DEPENDENCY_UNAVAILABLE', 'problem-request'),
      {
        message: 'Сервис временно недоступен.',
        requestId: 'problem-request',
        retryable: true,
      },
    ],
    [
      new ApiDocumentedResponseError(
        503,
        { status: 'unavailable' },
        'health-request',
      ),
      {
        message: 'Сервис временно недоступен.',
        requestId: 'health-request',
        retryable: true,
      },
    ],
  ])('never exposes backend title or detail', (error, expected) => {
    const presentation = getRouteErrorPresentation(error)

    expect(presentation).toEqual(expected)
    expect(JSON.stringify(presentation)).not.toContain('Raw backend')
  })

  it('revalidates a retryable route only after an explicit click', async () => {
    let attempts = 0
    const router = createMemoryRouter(
      [
        {
          path: '/',
          loader: () => {
            attempts += 1
            if (attempts === 1) throw new ApiNetworkError()
            return null
          },
          element: <p>Planner восстановлен</p>,
          errorElement: <RouteError />,
        },
      ],
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    expect(
      await screen.findByText('Не удалось подключиться к серверу.'),
    ).toBeVisible()
    expect(attempts).toBe(1)

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('Planner восстановлен')).toBeVisible()
    expect(attempts).toBe(2)
  })
})
