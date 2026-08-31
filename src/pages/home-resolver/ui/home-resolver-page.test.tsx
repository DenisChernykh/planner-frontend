import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TrackingTodayNavigationSource } from '@/entities/tracking'

import { HomeResolverPage } from './home-resolver-page'

const state = vi.hoisted(() => ({
  today: {
    state: 'no_plan',
    targetMonth: '2026-08',
  } as TrackingTodayNavigationSource,
}))

vi.mock('@/entities/tracking', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/tracking')>()
  return {
    ...actual,
    useTrackingToday: () => ({ data: state.today }),
  }
})

function renderResolver() {
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomeResolverPage />} />
          <Route path="/today" element={<p>today destination</p>} />
          <Route path="/plans/*" element={<p>plans destination</p>} />
          <Route path="/settings" element={<p>settings destination</p>} />
          <Route
            path="/statistics/:targetMonth"
            element={<p>statistics destination</p>}
          />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )
}

describe('home resolver', () => {
  beforeEach(() => {
    state.today = { state: 'no_plan', targetMonth: '2026-08' }
  })

  it.each([
    [{ state: 'no_plan', targetMonth: '2026-08' }, 'plans destination'],
    [
      {
        lifecycleMode: 'ordinary',
        monthStatus: 'published',
        phase: 'active',
        state: 'published',
        targetMonth: '2026-08',
      },
      'today destination',
    ],
    [
      {
        lifecycleMode: 'reopened',
        monthStatus: 'closed',
        phase: 'closed',
        state: 'published',
        targetMonth: '2026-08',
      },
      'statistics destination',
    ],
  ] satisfies [TrackingTodayNavigationSource, string][])(
    'maps authoritative state %#',
    async (today, destination) => {
      state.today = today
      renderResolver()

      expect(await screen.findByText(destination)).toBeVisible()
    },
  )

  it('consumes safe intent once before server-state resolution', async () => {
    sessionStorage.setItem('planner.return-to.v1', '/settings')
    renderResolver()

    expect(await screen.findByText('settings destination')).toBeVisible()
    expect(sessionStorage.getItem('planner.return-to.v1')).toBeNull()
  })

  it('consumes root intent without redirecting back into a loop', async () => {
    sessionStorage.setItem('planner.return-to.v1', '/')
    renderResolver()

    expect(await screen.findByText('plans destination')).toBeVisible()
    expect(sessionStorage.getItem('planner.return-to.v1')).toBeNull()
  })
})
