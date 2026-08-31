import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'
import {
  scalarFactControllerRecordCheckpoint,
  scalarFactControllerRecordFact,
  scalarFactControllerRecordRating,
  scalarFactControllerRecordTime,
} from '@/shared/api'

import { RecordFactActions } from './record-fact-actions'

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api')>()
  return {
    ...actual,
    scalarFactControllerRecordCheckpoint: vi.fn(),
    scalarFactControllerRecordFact: vi.fn(),
    scalarFactControllerRecordRating: vi.fn(),
    scalarFactControllerRecordTime: vi.fn(),
  }
})

const response = {
  aggregateId: '44444444-4444-4444-8444-444444444444',
  aggregateRevision: '2',
  kind: 'tracking.fact-record.v1',
} as const
const target = {
  localDate: '2026-08-30',
  planGoalSnapshotId: '11111111-1111-4111-8111-111111111111',
  publicationId: '22222222-2222-4222-8222-222222222222',
}

const today = {
  day: { closure: { state: 'open' } },
  monthStatus: 'published',
  phase: 'active',
  queryLocalDate: target.localDate,
  publicationId: target.publicationId,
} as unknown as PublishedTodayPresentation

function createGoal(measurement: unknown): TrackingGoalPresentation {
  return {
    config: { checkpoints: null, measurement },
    day: {
      applicable: true,
      fixedExpectations: [],
      state: 'no_data',
      writable: true,
    },
    planGoalSnapshotId: target.planGoalSnapshotId,
    title: 'Тестовая цель',
    viewerAccess: 'personal_owner',
  } as unknown as TrackingGoalPresentation
}

describe('RecordFactActions', () => {
  beforeEach(() => {
    vi.mocked(scalarFactControllerRecordCheckpoint).mockReset()
    vi.mocked(scalarFactControllerRecordFact).mockReset()
    vi.mocked(scalarFactControllerRecordRating).mockReset()
    vi.mocked(scalarFactControllerRecordTime).mockReset()
    vi.mocked(scalarFactControllerRecordCheckpoint).mockResolvedValue(response)
    vi.mocked(scalarFactControllerRecordFact).mockResolvedValue(response)
    vi.mocked(scalarFactControllerRecordRating).mockResolvedValue(response)
    vi.mocked(scalarFactControllerRecordTime).mockResolvedValue(response)
  })

  it('routes boolean input to facts and refreshes Today after success', async () => {
    const refetch = vi.fn(async () => undefined)
    render(
      <RecordFactActions
        goal={createGoal({ kind: 'boolean' })}
        isOnline
        refetch={refetch}
        today={today}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Записать' }))
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce())
    expect(scalarFactControllerRecordFact).toHaveBeenCalledWith(
      expect.objectContaining({
        localDate: target.localDate,
        planGoalSnapshotId: target.planGoalSnapshotId,
        publicationId: target.publicationId,
        value: { kind: 'boolean', result: 'done' },
      }),
    )
  })

  it.each([
    [
      'quantity',
      {
        kind: 'quantity',
        mode: 'targeted',
        aggregation: 'add',
        precision: 2,
        target: '3.50',
        unit: 'км',
      },
      '12.30',
      scalarFactControllerRecordFact,
      { value: { kind: 'quantity', value: '12.30' } },
      'localDate',
    ],
    [
      'actual time',
      { kind: 'actual_time', start: '08:00', end: '18:00' },
      '09:15',
      scalarFactControllerRecordTime,
      { value: '09:15' },
      'expectationDate',
    ],
    [
      'rating',
      { kind: 'rating', minimum: 1, maximum: 10 },
      '8',
      scalarFactControllerRecordRating,
      { value: 8 },
      'expectationDate',
    ],
  ] as const)(
    'routes %s using the generated operation DTO',
    async (_name, measurement, value, operation, valueBody, dateField) => {
      const refetch = vi.fn(async () => undefined)
      render(
        <RecordFactActions
          goal={createGoal(measurement)}
          isOnline
          refetch={refetch}
          today={today}
        />,
      )
      const input = screen.getByLabelText(/км|Фактическое время|Оценка/)
      fireEvent.change(input, { target: { value } })
      expect(input).toHaveValue(value)
      await userEvent.click(screen.getByRole('button', { name: 'Записать' }))
      await new Promise((resolve) => setTimeout(resolve, 10))
      await waitFor(() => expect(operation).toHaveBeenCalledOnce())
      await waitFor(() => expect(refetch).toHaveBeenCalledOnce())
      expect(operation).toHaveBeenCalledWith(
        expect.objectContaining({
          ...valueBody,
          [dateField]: target.localDate,
        }),
      )
    },
  )

  it('does not expose actions to partner read-only or offline surfaces', () => {
    const partner = {
      ...createGoal({ kind: 'boolean' }),
      viewerAccess: 'partner_read_only',
    } as TrackingGoalPresentation
    const { rerender } = render(
      <RecordFactActions
        goal={partner}
        isOnline
        today={today}
        refetch={vi.fn()}
      />,
    )
    expect(screen.queryByText('Записать')).not.toBeInTheDocument()

    rerender(
      <RecordFactActions
        goal={createGoal({ kind: 'boolean' })}
        isOnline={false}
        refetch={vi.fn()}
        today={today}
      />,
    )
    expect(screen.queryByText('Записать')).not.toBeInTheDocument()
  })
})
