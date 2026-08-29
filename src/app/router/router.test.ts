import { describe, expect, it } from 'vitest'

import { routes } from './router'

describe('Planner route foundation', () => {
  it('contains only neutral foundation routes', () => {
    expect(routes.map((route) => route.path)).toEqual(['/', '*'])
  })

  it('does not import starter product route families', () => {
    const paths = JSON.stringify(routes.map((route) => route.path))

    expect(paths).not.toContain('approval-requests')
    expect(paths).not.toContain('/admin')
    expect(paths).not.toContain('/register')
  })
})
