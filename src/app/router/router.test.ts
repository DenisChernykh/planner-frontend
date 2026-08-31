import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { createAppRoutes } from './router'

describe('Planner M2 route graph', () => {
  const routes = createAppRoutes(new QueryClient())

  it('keeps only login and finite Telegram result outside the protected parent', () => {
    expect(routes.map((route) => route.path)).toEqual([
      '/login',
      '/auth/telegram/result',
      '/',
    ])
  })

  it('owns every canonical destination and wildcard under the session gate', () => {
    const protectedRoute = routes.find((route) => route.path === '/')
    expect(protectedRoute?.loader).toBeTypeOf('function')
    expect(
      protectedRoute?.children?.map((route) =>
        route.index ? '(index)' : route.path,
      ),
    ).toEqual([
      '(index)',
      'today',
      'months/:targetMonth',
      'plans',
      'statistics/:targetMonth',
      'settings',
      '*',
    ])
  })

  it('does not import starter product route families', () => {
    const paths = JSON.stringify(routes)

    expect(paths).not.toContain('approval-requests')
    expect(paths).not.toContain('/admin')
    expect(paths).not.toContain('/register')
  })
})
