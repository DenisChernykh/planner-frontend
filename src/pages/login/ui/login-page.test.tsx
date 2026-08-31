import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OnlineStatusProvider } from '@/shared/lib/online-status'

import { LoginPage } from './login-page'

function renderLogin(entry: string, isOnline = true) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(isOnline)
  const queryClient = new QueryClient()

  render(
    <QueryClientProvider client={queryClient}>
      <OnlineStatusProvider>
        <MemoryRouter initialEntries={[entry]}>
          <LoginPage />
        </MemoryRouter>
      </OnlineStatusProvider>
    </QueryClientProvider>,
  )
}

describe('Telegram login page', () => {
  afterEach(() => vi.restoreAllMocks())

  it('stores a pathname only on the explicit document-navigation click', () => {
    sessionStorage.setItem('planner.return-to.v1', '/plans')
    renderLogin('/login?returnTo=%2Fstatistics%2F2026-08')

    expect(sessionStorage.getItem('planner.return-to.v1')).toBeNull()
    const link = screen.getByRole('link', {
      name: /Продолжить через Telegram/u,
    })
    expect(link).toHaveAttribute('href', '/auth/telegram/start')

    link.addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(link)

    expect(sessionStorage.getItem('planner.return-to.v1')).toBe(
      '/statistics/2026-08',
    )
  })

  it('drops an unsafe query and stores only the root resolver intent', () => {
    renderLogin('/login?returnTo=%2Ftoday%3Ftoken%3Draw')
    const link = screen.getByRole('link', {
      name: /Продолжить через Telegram/u,
    })
    link.addEventListener('click', (event) => event.preventDefault())

    fireEvent.click(link)

    expect(sessionStorage.getItem('planner.return-to.v1')).toBe('/')
    expect(document.body).not.toHaveTextContent('token')
  })

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
    ['auxiliary', { button: 1 }],
  ] as const)(
    'does not enter leaving state for a %s click',
    (_label, options) => {
      renderLogin('/login?returnTo=%2Fplans')
      const link = screen.getByRole('link', {
        name: /Продолжить через Telegram/u,
      })
      link.addEventListener('click', (event) => event.preventDefault())

      fireEvent.click(link, options)

      expect(link).not.toHaveAttribute('aria-busy')
      expect(screen.getByText('Продолжить через Telegram')).toBeVisible()
      expect(sessionStorage.getItem('planner.return-to.v1')).toBe('/plans')
    },
  )

  it('allows a later normal click after a modified click', () => {
    renderLogin('/login?returnTo=%2Fplans')
    const link = screen.getByRole('link', {
      name: /Продолжить через Telegram/u,
    })

    link.addEventListener('click', (event) => event.preventDefault(), {
      once: true,
    })
    fireEvent.click(link, { ctrlKey: true })
    expect(link).not.toHaveAttribute('aria-busy')

    const preventDocumentNavigation = (event: Event) => event.preventDefault()
    document.body.addEventListener('click', preventDocumentNavigation, {
      once: true,
    })
    fireEvent.click(link)

    expect(link).toHaveAttribute('aria-busy', 'true')
  })

  it('disables ceremony start offline and never queues it for reconnect', () => {
    renderLogin('/login?returnTo=%2Ftoday', false)

    expect(
      screen.getByRole('button', { name: 'Нет подключения' }),
    ).toBeDisabled()
    expect(
      screen.queryByRole('link', { name: /Telegram/u }),
    ).not.toBeInTheDocument()
    expect(sessionStorage.getItem('planner.return-to.v1')).toBeNull()
  })
})
