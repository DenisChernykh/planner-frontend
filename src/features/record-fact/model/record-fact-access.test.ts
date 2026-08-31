import { describe, expect, it } from 'vitest'

import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'

import { canRecordFact } from './record-fact-access'

const goal = {
  viewerAccess: 'personal_owner',
  day: { applicable: true, state: 'no_data', writable: true },
} as unknown as TrackingGoalPresentation
const today = {
  phase: 'active',
  monthStatus: 'published',
  day: { closure: { state: 'open' } },
} as unknown as PublishedTodayPresentation

describe('canRecordFact', () => {
  it.each([
    ['online owner', true, 'personal_owner', true, 'no_data', true],
    ['online shared', true, 'shared', true, 'partial', true],
    ['partner read-only', true, 'partner_read_only', true, 'no_data', false],
    ['server non-writable', true, 'personal_owner', false, 'no_data', false],
    [
      'server non-applicable',
      true,
      'personal_owner',
      true,
      'not_applicable',
      false,
    ],
    ['future expectation', true, 'personal_owner', true, 'future', false],
    ['offline', false, 'personal_owner', true, 'no_data', false],
  ] as const)(
    '%s follows server access and lifecycle',
    (_label, online, access, writable, state, expected) => {
      const currentGoal = {
        ...goal,
        viewerAccess: access,
        day: { applicable: state !== 'not_applicable', state, writable },
      } as unknown as TrackingGoalPresentation
      expect(canRecordFact(today, currentGoal, online)).toBe(expected)
    },
  )

  it.each([
    ['grace', 'grace'],
    ['closed month', 'closed'],
  ] as const)('blocks %s day phase', (_label, phase) => {
    expect(
      canRecordFact(
        { ...today, phase } as unknown as PublishedTodayPresentation,
        goal,
        true,
      ),
    ).toBe(false)
  })

  it('blocks a closed day even when goal access is writable', () => {
    expect(
      canRecordFact(
        {
          ...today,
          day: { closure: { state: 'closed' } },
        } as unknown as PublishedTodayPresentation,
        goal,
        true,
      ),
    ).toBe(false)
  })
})
