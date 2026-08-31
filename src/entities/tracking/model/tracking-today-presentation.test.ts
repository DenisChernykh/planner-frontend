import { describe, expect, it } from 'vitest'

import type { TrackingTodayResponseV1 } from '@/shared/api'

import { selectTrackingTodayPresentation } from './tracking-today-presentation'

const ratio = { denominator: '10', numerator: '4' }
const metric = { available: true, basisPoints: '4000', exact: ratio }
const progress = {
  contribution: { coverage: { applicable: '1', filled: '1' }, score: ratio },
  coverage: { applicable: '1', filled: '1' },
  formulaVersions: { calendar: 'calendar.v1', evaluation: 'evaluation.v1' },
  overperformance: metric,
  periods: [],
  progress: metric,
  score: metric,
}

function dayGoal(planGoalSnapshotId: string, writable: boolean) {
  return {
    applicable: true,
    correctionWritable: writable,
    coverage: { applicable: '2', filled: '1' },
    fixedExpectations: [
      {
        componentId: null,
        componentKind: 'goal',
        facts: [],
        fixedExpectationId: `fixed-${planGoalSnapshotId}`,
        state: 'partial',
      },
    ],
    flexiblePeriods: [
      {
        actualProgress: ratio,
        eligibleOnDate: true,
        expectedProgress: 0.5,
        facts: [],
        flexiblePeriodId: `period-${planGoalSnapshotId}`,
        ordinal: 1,
        periodEnd: '2026-08-31',
        periodKind: 'weekly',
        periodStart: '2026-08-24',
        periodTarget: 2,
        state: 'partial',
      },
    ],
    planGoalSnapshotId,
    progress,
    state: 'partial',
    writable,
  }
}

function publishedToday(): TrackingTodayResponseV1 {
  const goal = (id: string, displayOrder: number, viewerAccess: string) => ({
    calendar: {
      activeLocalDate: '2026-08-30',
      expectationDates: ['2026-08-30'],
      kind: 'fixed',
      targetMonth: '2026-08',
      timeZone: 'Asia/Yekaterinburg',
    },
    category: `category-${id}`,
    config: {
      checkpoints: null,
      measurement: { kind: 'boolean' },
      repetition: { kind: 'daily' },
      schemaVersion: 'published.goal-config.v1',
      scope: {
        kind: viewerAccess === 'shared' ? 'shared' : 'personal',
        ownerMemberId: 'member',
      },
    },
    displayOrder,
    planGoalSnapshotId: id,
    progress,
    sourceGoalSeriesId: `series-${id}`,
    title: `Goal ${id}`,
    viewerAccess,
    why: `Why ${id}`,
  })

  return {
    activeLocalDate: '2026-08-30',
    day: {
      closure: {
        closedAt: null,
        closedCount: null,
        dayCloseId: null,
        revision: null,
        state: 'open',
      },
      coverage: { applicable: '6', filled: '3' },
      goals: [
        dayGoal('goal-a', true),
        dayGoal('goal-b', false),
        dayGoal('goal-c', true),
      ],
      localDate: '2026-08-30',
      state: 'partial',
    },
    factsRevision: '12',
    focus: 'Keep a clear pace',
    goals: [
      goal('goal-a', 2, 'personal_owner'),
      goal('goal-b', 0, 'partner_read_only'),
      goal('goal-c', 1, 'shared'),
    ],
    latePublication: false,
    lifecycleMode: 'ordinary',
    lifecycleRevision: '3',
    monthStatus: 'published',
    phase: 'active',
    planMonthId: '11111111-1111-4111-8111-111111111111',
    publicationId: '22222222-2222-4222-8222-222222222222',
    publicationRevision: '4',
    queryLocalDate: '2026-08-30',
    schemaVersion: 'tracking.today.v1',
    state: 'published',
    targetMonth: '2026-08',
  } as unknown as TrackingTodayResponseV1
}

describe('Today presentation selector', () => {
  it('keeps no-plan state and formats the server date in product timezone', () => {
    const result = selectTrackingTodayPresentation({
      queryLocalDate: '2026-08-30',
      schemaVersion: 'tracking.today.v1',
      state: 'no_plan',
      targetMonth: '2026-08',
    })

    expect(result).toMatchObject({
      localDateLabel: '30 августа 2026',
      queryLocalDate: '2026-08-30',
      state: 'no_plan',
      timeZone: 'Asia/Yekaterinburg',
    })
    expect(result.goals).toEqual([])
  })

  it('joins server day data and orders goals by displayOrder', () => {
    const result = selectTrackingTodayPresentation(publishedToday())

    expect(result.state).toBe('published')
    if (result.state !== 'published') return

    expect(result.goals.map((goal) => goal.title)).toEqual([
      'Goal goal-b',
      'Goal goal-c',
      'Goal goal-a',
    ])
    expect(result.goals.map((goal) => goal.viewerAccess)).toEqual([
      'partner_read_only',
      'shared',
      'personal_owner',
    ])
    expect(result.goals[0]?.day.writable).toBe(false)
    expect(result.goals[1]?.day.flexiblePeriods[0]?.actualProgress).toEqual(
      ratio,
    )
    expect(result.factsRevision).toBe('12')
  })

  it('omits month goals without a matching day entry', () => {
    const today = publishedToday()
    if (today.state !== 'published') return

    today.goals.push({
      ...today.goals[0]!,
      displayOrder: 3,
      planGoalSnapshotId: 'goal-without-day-entry',
      title: 'Not scheduled today',
    })

    const result = selectTrackingTodayPresentation(today)

    expect(result.goals.map((goal) => goal.title)).not.toContain(
      'Not scheduled today',
    )
  })
})
