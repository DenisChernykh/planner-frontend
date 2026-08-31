import { describe, expect, it } from 'vitest'

import {
  selectRootDestination,
  selectTrackingNavigation,
  type TrackingTodayNavigationSource,
} from './tracking-navigation'

type PublishedSource = Extract<
  TrackingTodayNavigationSource,
  { state: 'published' }
>

function published(overrides: Partial<PublishedSource> = {}): PublishedSource {
  return {
    lifecycleMode: 'ordinary',
    monthStatus: 'published',
    phase: 'active',
    state: 'published',
    targetMonth: '2026-08',
    ...overrides,
  }
}

describe('tracking navigation selectors', () => {
  it.each([
    [{ state: 'no_plan', targetMonth: '2026-08' }, 'plans'],
    [{ state: 'draft', targetMonth: '2026-08' }, 'plans'],
    [published(), 'today'],
    [published({ phase: 'future' }), 'plans'],
    [published({ monthStatus: 'grace', phase: 'grace' }), 'statistics'],
    [published({ monthStatus: 'closed', phase: 'closed' }), 'statistics'],
  ] as const)('maps authoritative state %# to %s', (today, kind) => {
    expect(selectRootDestination(today)).toEqual({
      kind,
      targetMonth: '2026-08',
    })
  })

  it('projects only shell-safe lifecycle context', () => {
    expect(
      selectTrackingNavigation(
        published({
          lifecycleMode: 'reopened',
          monthStatus: 'grace',
          phase: 'grace',
        }),
      ),
    ).toEqual({
      lifecycleMode: 'reopened',
      monthStatus: 'grace',
      phase: 'grace',
      state: 'published',
      targetMonth: '2026-08',
    })
  })

  it('accepts a reclosed reopened lifecycle', () => {
    expect(
      selectTrackingNavigation(
        published({
          lifecycleMode: 'reopened',
          monthStatus: 'closed',
          phase: 'closed',
        }),
      ),
    ).toMatchObject({ lifecycleMode: 'reopened', phase: 'closed' })
  })
})
