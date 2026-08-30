import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WorkspacePresentation } from '@/entities/workspace'

import { AppShell } from './app-shell'

const state = vi.hoisted(() => ({
  isMobile: false,
  isOnline: true,
  logout: vi.fn(),
  logoutShouldFail: false,
  refetch: vi.fn(),
  today: {
    lifecycleMode: 'ordinary',
    monthStatus: 'published',
    phase: 'active',
    state: 'published',
    targetMonth: '2026-08',
  },
}))

vi.mock('@/shared/lib/hooks/use-mobile', () => ({
  useIsMobile: () => state.isMobile,
}))

vi.mock('@/shared/lib/online-status', () => ({
  useOnlineStatus: () => ({ isOnline: state.isOnline }),
}))

vi.mock('@/features/logout', () => ({
  useLogout: () => {
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    return {
      errorMessage,
      isBlocked: false,
      isOnline: state.isOnline,
      isPending: false,
      logout: () => {
        state.logout()
        if (state.logoutShouldFail) {
          setErrorMessage(
            'Сервис временно недоступен. Сессия остаётся активной.',
          )
        }
      },
    }
  },
}))

vi.mock('@/entities/tracking', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/tracking')>()
  return {
    ...actual,
    useTrackingToday: () => ({
      data: state.today,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: state.refetch,
    }),
  }
})

const workspace: WorkspacePresentation = {
  currentMember: { displayName: 'Денис' },
  partnerMember: { displayName: 'Таня' },
  timeZone: 'Asia/Yekaterinburg',
}

function renderShell(entry = '/today') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<AppShell workspace={workspace} />}>
          <Route path="today" element={<section>Today content</section>} />
          <Route
            path="months/:targetMonth"
            element={<section>Month content</section>}
          />
          <Route path="plans/*" element={<section>Plans content</section>} />
          <Route
            path="statistics/:targetMonth"
            element={<section>Statistics content</section>}
          />
          <Route
            path="settings"
            element={<section>Settings content</section>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Planner AppShell', () => {
  beforeEach(() => {
    state.isMobile = false
    state.isOnline = true
    state.logout.mockReset()
    state.logoutShouldFail = false
    state.refetch.mockReset()
  })

  it('renders four destinations, backend labels and exactly one main', () => {
    renderShell()

    const navigation = screen.getByRole('navigation', {
      name: 'Основная навигация',
    })
    expect(
      within(navigation)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Сегодня', 'Месяц', 'Планы', 'Статистика'])
    expect(
      within(navigation).getByRole('link', { name: 'Сегодня' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: 'Planner — на главную' }),
    ).toHaveAttribute('href', '/')
    expect(screen.getAllByText('Денис').length).toBeGreaterThan(0)
    expect(screen.getByText('с Таня')).toBeVisible()
    expect(screen.getByText('Today content')).toBeVisible()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Сегодня' }),
    ).toHaveFocus()
  })

  it('supports keyboard account menu and restores focus on Escape', async () => {
    const user = userEvent.setup()
    renderShell()
    const trigger = screen.getByRole('button', {
      name: 'Аккаунт: Денис и Таня',
    })

    trigger.focus()
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('menuitem', { name: 'Настройки' }),
    ).toBeVisible()

    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('closes the account menu after navigating to settings', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(
      screen.getByRole('button', { name: 'Аккаунт: Денис и Таня' }),
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Настройки' }))

    expect(await screen.findByText('Settings content')).toBeVisible()
    expect(
      screen.queryByRole('menuitem', { name: 'Настройки' }),
    ).not.toBeInTheDocument()
  })

  it('keeps a non-auth logout failure visible in the open account menu', async () => {
    state.logoutShouldFail = true
    const user = userEvent.setup()
    renderShell()

    await user.click(
      screen.getByRole('button', { name: 'Аккаунт: Денис и Таня' }),
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Выйти' }))

    expect(state.logout).toHaveBeenCalledOnce()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Сервис временно недоступен. Сессия остаётся активной.',
    )
    expect(screen.getByRole('menuitem', { name: 'Выйти' })).toBeVisible()
  })

  it('marks a navigation family current and focuses the new route title', async () => {
    const user = userEvent.setup()
    renderShell('/today')

    await user.click(screen.getByRole('link', { name: 'Планы' }))

    const title = await screen.findByRole('heading', {
      level: 1,
      name: 'Планы',
    })
    expect(title).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Планы' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('keeps the plans destination current on a nested route', () => {
    renderShell('/plans/new')

    expect(screen.getByRole('link', { name: 'Планы' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it.each([
    ['/months/2025-07', 'Месяц'],
    ['/statistics/2025-07', 'Статистика'],
  ])(
    'uses the family state for aria-current on historical route %s',
    (entry, label) => {
      renderShell(entry)

      const link = screen.getByRole('link', { name: label })
      expect(link).toHaveAttribute('aria-current', 'page')
      expect(link).toHaveAttribute(
        'href',
        label === 'Месяц' ? '/months/2026-08' : '/statistics/2026-08',
      )
    },
  )

  it('exposes the current desktop sidebar state on its trigger', async () => {
    const user = userEvent.setup()
    renderShell()

    const collapse = screen.getByRole('button', { name: 'Скрыть навигацию' })
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
    await user.click(collapse)

    expect(
      screen.getByRole('button', { name: 'Открыть навигацию' }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('uses the same destinations in the mobile sheet and closes after navigation', async () => {
    state.isMobile = true
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Открыть навигацию' }))
    const plans = await screen.findByRole('link', { name: 'Планы' })
    await user.click(plans)

    expect(await screen.findByText('Plans content')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Планы' }),
    ).toHaveFocus()
  })

  it('keeps a persistent offline status without triggering any action', () => {
    state.isOnline = false
    renderShell()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Вы офлайн. Доступен только уже загруженный просмотр',
    )
    expect(state.refetch).not.toHaveBeenCalled()
  })
})
