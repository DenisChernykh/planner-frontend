import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  TELEGRAM_OIDC_RESULT_CODES,
  type TelegramOidcResultCode,
} from '@/shared/api'
import { OnlineStatusProvider } from '@/shared/lib/online-status'

import { TelegramResultPage } from './telegram-result-page'

const expectedTitles: Record<TelegramOidcResultCode, string> = {
  success: 'Сессию не удалось подтвердить',
  cancelled: 'Вход отменён',
  login_rejected: 'Telegram не подтвердил вход',
  access_denied: 'Доступ к Planner не разрешён',
  dependency_unavailable: 'Сервис входа временно недоступен',
  invalid_callback: 'Не удалось проверить ответ Telegram',
}

function renderResult(search: string) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  const queryClient = new QueryClient()

  render(
    <QueryClientProvider client={queryClient}>
      <OnlineStatusProvider>
        <MemoryRouter initialEntries={[`/auth/telegram/result${search}`]}>
          <TelegramResultPage />
        </MemoryRouter>
      </OnlineStatusProvider>
    </QueryClientProvider>,
  )
}

describe('Telegram finite result page', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(TELEGRAM_OIDC_RESULT_CODES)('renders safe copy for %s', (result) => {
    renderResult(`?result=${result}`)

    expect(screen.getByText(expectedTitles[result])).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Начать новый вход' }),
    ).toHaveAttribute('href', '/auth/telegram/start')
    expect(document.body).not.toHaveTextContent('Raw backend')
  })

  it.each([
    '',
    '?result=unknown_raw_secret',
    '?result=success&result=cancelled',
  ])('collapses malformed result %s to one generic state', (search) => {
    renderResult(search)

    expect(screen.getByText('Результат входа не распознан')).toBeVisible()
    expect(document.body).not.toHaveTextContent('unknown_raw_secret')
    expect(document.body).not.toHaveTextContent('success&result')
  })

  it('treats success without a real session as recoverable failure', () => {
    renderResult('?result=success')

    expect(
      screen.getByText(/Planner не получил активную сессию/u),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Начать новый вход' }),
    ).toHaveAttribute('href', '/auth/telegram/start')
  })

  it('offers a new isolated ceremony after access denial', () => {
    renderResult('?result=access_denied')

    expect(
      screen.getByRole('link', { name: 'Начать новый вход' }),
    ).toHaveAttribute('href', '/auth/telegram/start')
  })

  it('creates a new root ceremony only after the explicit retry click', () => {
    renderResult('?result=cancelled')
    expect(sessionStorage.getItem('planner.return-to.v1')).toBeNull()
    const link = screen.getByRole('link', { name: 'Начать новый вход' })
    link.addEventListener('click', (event) => event.preventDefault())

    fireEvent.click(link)

    expect(sessionStorage.getItem('planner.return-to.v1')).toBe('/')
  })

  it('clears a stale one-time return target', () => {
    sessionStorage.setItem('planner.return-to.v1', '/today')
    renderResult('?result=cancelled')

    expect(sessionStorage.getItem('planner.return-to.v1')).toBeNull()
  })
})
