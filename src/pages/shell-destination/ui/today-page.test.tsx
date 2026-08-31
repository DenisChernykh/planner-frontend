import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TrackingTodayPresentation } from '@/entities/tracking'
import { ApiNetworkError } from '@/shared/api'

import { TodayPage } from './today-page'

const state = vi.hoisted(() => ({
  isError: false,
  isFetching: false,
  isOnline: true,
  refetch: vi.fn(),
  today: undefined as TrackingTodayPresentation | undefined,
}))

const apiState = vi.hoisted(() => ({
  recordFact: vi.fn(),
}))

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return { ...actual, scalarFactControllerRecordFact: apiState.recordFact }
})

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
const idleGoalId = '77777777-7777-4777-8777-777777777777'

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
  config: unknown = {},
) {
  return {
    calendar: { kind: 'fixed' },
    category: 'Здоровье',
    config,
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

const recoveryPublished = {
  ...published,
  goals: [
    goal(sharedGoalId, 'Общая цель', 'shared', true, {
      measurement: { kind: 'boolean' },
    }),
    goal(idleGoalId, 'Вторая цель', 'shared', true, {
      measurement: { kind: 'boolean' },
    }),
  ],
} as unknown as TrackingTodayPresentation

const closedPublished = {
  ...recoveryPublished,
  day: {
    ...recoveryPublished.day,
    closure: {
      closedAt: '2026-08-30T18:00:00+05:00',
      closedCount: '1',
      dayCloseId: '66666666-6666-4666-8666-666666666666',
      revision: '4',
      state: 'closed',
    },
    goals: [],
    state: 'closed',
  },
  goals: [],
  monthStatus: 'closed',
  phase: 'closed',
} as unknown as TrackingTodayPresentation

const noPlan = {
  day: null,
  goals: [],
  localDateLabel: '30 августа 2026',
  queryLocalDate: '2026-08-30',
  schemaVersion: 'tracking.today.v1',
  state: 'no_plan',
  targetMonth: '2026-08',
  timeZone: 'Asia/Yekaterinburg',
} as TrackingTodayPresentation

const draft = {
  day: null,
  goals: [],
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
    apiState.recordFact.mockReset()
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

  it.each([
    ['refresh', { isFetching: true, isError: false }],
    ['error', { isFetching: false, isError: true }],
  ] as const)(
    'keeps cached controls read-only during Today %s',
    (_name, flags) => {
      state.today = recoveryPublished
      state.isFetching = flags.isFetching
      state.isError = flags.isError
      render(<TodayPage />)

      expect(screen.getAllByRole('group', { name: 'Состояние' })).toHaveLength(
        2,
      )
      expect(screen.getAllByLabelText('Выполнено')[0]).toBeDisabled()
      expect(
        screen.queryByRole('button', { name: 'Записать' }),
      ).not.toBeInTheDocument()
      expect(apiState.recordFact).not.toHaveBeenCalled()
    },
  )

  it('retains an unknown recovery surface across closed, removed and no-plan refreshes', async () => {
    apiState.recordFact
      .mockRejectedValueOnce(new ApiNetworkError())
      .mockResolvedValueOnce(undefined)
    state.today = recoveryPublished
    const { rerender } = render(<TodayPage />)

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Записать' })[0],
    )
    await waitFor(() =>
      expect(screen.getByText(/Результат не подтверждён/)).toBeVisible(),
    )
    expect(screen.getAllByRole('group', { name: 'Состояние' })).toHaveLength(2)
    expect(
      screen.queryByRole('button', { name: 'Записать' }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('Выполнено')).toHaveLength(2)
    expect(
      screen
        .getAllByLabelText('Выполнено')
        .every((input) => input.matches(':disabled')),
    ).toBe(true)
    expect(apiState.recordFact).toHaveBeenCalledOnce()

    state.today = closedPublished
    rerender(<TodayPage />)
    expect(screen.getByText('Общая цель')).toBeVisible()
    expect(screen.getByText(/Результат не подтверждён/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeEnabled()

    state.today = noPlan
    rerender(<TodayPage />)
    expect(screen.getByText('Общая цель')).toBeVisible()
    expect(screen.getByText(/Результат не подтверждён/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeEnabled()
    expect(
      screen.queryByText('План на месяц ещё не создан'),
    ).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() =>
      expect(screen.getByText('План на месяц ещё не создан')).toBeVisible(),
    )
    expect(
      screen.queryByText(/Результат не подтверждён/),
    ).not.toBeInTheDocument()
    expect(apiState.recordFact).toHaveBeenCalledTimes(2)
  })
})
