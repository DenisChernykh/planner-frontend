import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TrackingTodayPresentation } from '@/entities/tracking'

import { TodayPage } from './today-page'

const state = vi.hoisted(() => ({
  isError: false,
  isFetching: false,
  isOnline: true,
  refetch: vi.fn(),
  today: undefined as TrackingTodayPresentation | undefined,
}))

vi.mock('@/entities/tracking', () => ({
  useTrackingToday: () => ({
    data: state.today,
    isError: state.isError,
    isFetching: state.isFetching,
    refetch: state.refetch,
  }),
}))

vi.mock('@/shared/lib/online-status', () => ({
  useOnlineStatus: () => ({ isOnline: state.isOnline }),
}))

const sharedGoalId = '11111111-1111-4111-8111-111111111111'
const partnerGoalId = '22222222-2222-4222-8222-222222222222'

function metric() {
  return {
    available: true,
    exact: { denominator: '2', numerator: '1' },
  }
}

function goal(
  planGoalSnapshotId: string,
  title: string,
  viewerAccess: 'personal_owner' | 'shared' | 'partner_read_only',
  writable: boolean,
) {
  return {
    calendar: { kind: 'fixed' },
    category: 'Здоровье',
    config: {},
    day: {
      applicable: true,
      correctionWritable: false,
      coverage: { applicable: '2', filled: '1' },
      fixedExpectations: [
        {
          componentId: null,
          componentKind: 'checkpoint',
          facts: [],
          fixedExpectationId: `${planGoalSnapshotId}-expectation`,
          state: 'partial',
        },
      ],
      flexiblePeriods: [
        {
          actualProgress: { denominator: '2', numerator: '1' },
          flexiblePeriodId: `${planGoalSnapshotId}-period`,
          ordinal: 1,
          periodEnd: '2026-08-30',
          periodKind: 'weekly',
          periodStart: '2026-08-24',
          state: 'partial',
        },
      ],
      planGoalSnapshotId,
      progress: {} as never,
      state: 'partial',
      writable,
    },
    displayOrder: 0,
    planGoalSnapshotId,
    progress: { progress: metric() },
    sourceGoalSeriesId: '33333333-3333-4333-8333-333333333333',
    title,
    viewerAccess,
    why: 'why',
  } as never
}

const published = {
  activeLocalDate: '2026-08-30',
  day: {
    closure: {
      closedAt: null,
      closedCount: null,
      dayCloseId: null,
      revision: null,
      state: 'open',
    },
    coverage: { applicable: '2', filled: '1' },
    goals: [],
    localDate: '2026-08-30',
    state: 'partial',
  },
  factsRevision: '17',
  focus: 'Сохранять ясный темп',
  goals: [
    goal(sharedGoalId, 'Общая цель', 'shared', true),
    goal(partnerGoalId, 'Цель партнёра', 'partner_read_only', false),
  ],
  latePublication: true,
  lifecycleMode: 'ordinary',
  lifecycleRevision: '3',
  localDateLabel: '30 августа 2026',
  monthStatus: 'published',
  phase: 'active',
  planMonthId: '44444444-4444-4444-8444-444444444444',
  publicationId: '55555555-5555-4555-8555-555555555555',
  publicationRevision: '2',
  queryLocalDate: '2026-08-30',
  schemaVersion: 'tracking.today.v1',
  state: 'published',
  targetMonth: '2026-08',
  timeZone: 'Asia/Yekaterinburg',
} as unknown as TrackingTodayPresentation

const noPlan = {
  localDateLabel: '30 августа 2026',
  queryLocalDate: '2026-08-30',
  schemaVersion: 'tracking.today.v1',
  state: 'no_plan',
  targetMonth: '2026-08',
  timeZone: 'Asia/Yekaterinburg',
} as TrackingTodayPresentation

const draft = {
  draftRevision: '4',
  focus: 'Черновой фокус',
  lifecycleRevision: '2',
  localDateLabel: '30 августа 2026',
  planMonthId: '44444444-4444-4444-8444-444444444444',
  queryLocalDate: '2026-08-30',
  schemaVersion: 'tracking.today.v1',
  state: 'draft',
  targetMonth: '2026-08',
  timeZone: 'Asia/Yekaterinburg',
} as TrackingTodayPresentation

describe('TodayPage', () => {
  beforeEach(() => {
    state.isError = false
    state.isFetching = false
    state.isOnline = true
    state.refetch.mockReset()
    state.today = published
  })

  it('renders mixed server-owned goals and exact Today state', () => {
    render(<TodayPage />)

    expect(screen.getByText('30 августа 2026')).toBeVisible()
    expect(screen.getByText('Сохранять ясный темп')).toBeVisible()
    expect(screen.getByText(/Месяц 2026-08/)).toBeVisible()
    expect(screen.getByText(/Все даты и локальные времена/)).toBeVisible()
    expect(screen.getByText('Опубликован с опозданием')).toBeVisible()
    expect(screen.getByText('Покрытие дня')).toBeVisible()
    expect(screen.getAllByText('1 / 2').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('Revision фактов')).toBeVisible()
    expect(screen.getByText('17')).toBeVisible()
    expect(screen.getByText('Общая')).toBeVisible()
    expect(screen.getByText('Личная · только чтение')).toBeVisible()
    expect(screen.getAllByText('Фиксированные ожидания')).toHaveLength(2)
    expect(screen.getAllByText('Гибкий прогресс')).toHaveLength(2)
    expect(screen.getByText('День открыт')).toBeVisible()
  })

  it.each([
    [noPlan, 'План на месяц ещё не создан'],
    [draft, 'План ещё не опубликован'],
  ] as const)('keeps %s in a safe read-only state', (today, heading) => {
    state.today = today
    render(<TodayPage />)

    expect(screen.getByText(heading)).toBeVisible()
    expect(screen.getByText('Обновить')).toBeVisible()
    expect(screen.queryByText('Цели дня')).not.toBeInTheDocument()
  })

  it('shows stale data and disables refresh while offline', () => {
    state.isOnline = false
    state.isError = true
    render(<TodayPage />)

    expect(
      screen.getByText(/Офлайн: показан последний подтверждённый просмотр/),
    ).toBeVisible()
    const refresh = screen.getByRole('button', { name: 'Обновить' })
    expect(refresh).toBeDisabled()
    fireEvent.click(refresh)
    expect(state.refetch).not.toHaveBeenCalled()
  })

  it('allows an explicit online refresh and surfaces stale error state', () => {
    state.isError = true
    render(<TodayPage />)

    expect(screen.getByText(/Не удалось обновить просмотр/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Обновить' }))
    expect(state.refetch).toHaveBeenCalledOnce()
  })
})
