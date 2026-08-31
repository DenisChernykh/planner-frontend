import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'
import {
  ApiNetworkError,
  ApiProblemError,
  compositeFactControllerRecordChecklistItem,
  compositeFactControllerRecordCompositeOccurrence,
  compositeFactControllerRecordOrVariant,
  compositeFactControllerRecordText,
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
    compositeFactControllerRecordChecklistItem: vi.fn(),
    compositeFactControllerRecordCompositeOccurrence: vi.fn(),
    compositeFactControllerRecordOrVariant: vi.fn(),
    compositeFactControllerRecordText: vi.fn(),
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

function createGoal(
  measurement: unknown,
  fixedExpectations: readonly unknown[] = [],
  flexiblePeriods: readonly unknown[] = [],
  checkpoints: unknown = null,
): TrackingGoalPresentation {
  return {
    config: { checkpoints, measurement },
    day: {
      applicable: true,
      fixedExpectations,
      flexiblePeriods,
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
    vi.mocked(compositeFactControllerRecordChecklistItem).mockReset()
    vi.mocked(compositeFactControllerRecordCompositeOccurrence).mockReset()
    vi.mocked(compositeFactControllerRecordOrVariant).mockReset()
    vi.mocked(compositeFactControllerRecordText).mockReset()
    vi.mocked(scalarFactControllerRecordCheckpoint).mockResolvedValue(response)
    vi.mocked(scalarFactControllerRecordFact).mockResolvedValue(response)
    vi.mocked(scalarFactControllerRecordRating).mockResolvedValue(response)
    vi.mocked(scalarFactControllerRecordTime).mockResolvedValue(response)
    vi.mocked(compositeFactControllerRecordChecklistItem).mockResolvedValue(
      response,
    )
    vi.mocked(
      compositeFactControllerRecordCompositeOccurrence,
    ).mockResolvedValue(response)
    vi.mocked(compositeFactControllerRecordOrVariant).mockResolvedValue(
      response,
    )
    vi.mocked(compositeFactControllerRecordText).mockResolvedValue(response)
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

    expect(screen.getByRole('group', { name: 'Состояние' })).toBeVisible()
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

  it('reconciles stale data before requiring a new confirmation', async () => {
    const conflict = new ApiProblemError(
      {
        type: 'https://planner.example.test/problems/conflict',
        title: 'Conflict',
        status: 409,
        detail: 'Conflict',
        instance: 'urn:request:conflict',
        code: 'TRACKING_FACT_TARGET_UNAVAILABLE',
        requestId: 'request-conflict',
      },
      null,
    )
    vi.mocked(scalarFactControllerRecordFact)
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce(response)
    const refetch = vi.fn(async () => undefined)
    render(
      <RecordFactActions
        goal={createGoal({ kind: 'boolean' })}
        isOnline
        refetch={refetch}
        today={today}
      />,
    )

    const submit = screen.getByRole('button', { name: 'Записать' })
    await userEvent.click(submit)
    await waitFor(() =>
      expect(screen.getByText(/Данные изменились на сервере/)).toBeVisible(),
    )
    await userEvent.click(submit)
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce())
    expect(scalarFactControllerRecordFact).toHaveBeenCalledOnce()

    await userEvent.click(submit)
    await waitFor(() =>
      expect(scalarFactControllerRecordFact).toHaveBeenCalledTimes(2),
    )
    expect(
      vi.mocked(scalarFactControllerRecordFact).mock.calls[1]?.[0]?.commandId,
    ).not.toBe(
      vi.mocked(scalarFactControllerRecordFact).mock.calls[0]?.[0]?.commandId,
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

  it('keeps cached controls mounted but read-only while Today is refreshing', () => {
    render(
      <RecordFactActions
        canMutate={false}
        goal={createGoal({ kind: 'boolean' })}
        isOnline
        refetch={vi.fn()}
        today={today}
      />,
    )

    expect(screen.getByRole('group', { name: 'Состояние' })).toBeVisible()
    expect(screen.getByLabelText('Выполнено')).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Записать' }),
    ).not.toBeInTheDocument()
    expect(scalarFactControllerRecordFact).not.toHaveBeenCalled()
  })

  it('routes text facts through the fixed text operation', async () => {
    const refetch = vi.fn(async () => undefined)
    render(
      <RecordFactActions
        goal={createGoal({ kind: 'text' }, [
          { componentId: null, componentKind: 'goal' },
        ])}
        isOnline
        refetch={refetch}
        today={today}
      />,
    )

    expect(screen.getByRole('group', { name: 'Результат' })).toBeVisible()
    fireEvent.change(screen.getByLabelText('Текстовый факт'), {
      target: { value: 'Итог дня' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Записать' }))
    await waitFor(() =>
      expect(compositeFactControllerRecordText).toHaveBeenCalledOnce(),
    )
    expect(compositeFactControllerRecordText).toHaveBeenCalledWith(
      expect.objectContaining({
        checkpointId: null,
        expectationDate: target.localDate,
        result: 'done',
        text: 'Итог дня',
      }),
    )
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('exposes only backend-expected checklist item IDs', async () => {
    const itemId = '33333333-3333-4333-8333-333333333333'
    const refetch = vi.fn(async () => undefined)
    render(
      <RecordFactActions
        goal={createGoal(
          {
            kind: 'checklist',
            items: [{ itemId, label: 'Прогулка' }],
          },
          [{ componentId: itemId, componentKind: 'checklist_item' }],
        )}
        isOnline
        refetch={refetch}
        today={today}
      />,
    )

    expect(screen.getByRole('group', { name: 'Прогулка' })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Записать' }))
    await waitFor(() =>
      expect(compositeFactControllerRecordChecklistItem).toHaveBeenCalledOnce(),
    )
    expect(compositeFactControllerRecordChecklistItem).toHaveBeenCalledWith(
      expect.objectContaining({ checklistItemId: itemId, checkpointId: null }),
    )
  })

  it('routes fixed OR variants with a server-provided goal expectation', async () => {
    const variantId = '33333333-3333-4333-8333-333333333333'
    const refetch = vi.fn(async () => undefined)
    render(
      <RecordFactActions
        goal={createGoal(
          {
            kind: 'any_of',
            variants: [
              {
                label: 'Стаканы',
                precision: 2,
                target: '2',
                unit: 'шт',
                variantId,
              },
            ],
          },
          [{ componentId: null, componentKind: 'goal' }],
        )}
        isOnline
        refetch={refetch}
        today={today}
      />,
    )

    fireEvent.change(screen.getByLabelText('Стаканы (шт)'), {
      target: { value: '2.00' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Записать' }))
    await waitFor(() =>
      expect(compositeFactControllerRecordOrVariant).toHaveBeenCalledOnce(),
    )
    expect(compositeFactControllerRecordOrVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        checkpointId: null,
        value: '2.00',
        variantId,
      }),
    )
  })

  it('routes eligible flexible OR occurrences with the component discriminant', async () => {
    const variantId = '33333333-3333-4333-8333-333333333333'
    const refetch = vi.fn(async () => undefined)
    render(
      <RecordFactActions
        goal={createGoal(
          {
            kind: 'any_of',
            variants: [
              {
                label: 'Стаканы',
                precision: 2,
                target: '2',
                unit: 'шт',
                variantId,
              },
            ],
          },
          [],
          [{ eligibleOnDate: true }],
        )}
        isOnline
        refetch={refetch}
        today={today}
      />,
    )

    const input = screen.getByLabelText('Стаканы (шт)')
    fireEvent.change(input, { target: { value: '1.20' } })
    await userEvent.click(screen.getByRole('button', { name: 'Записать' }))
    await waitFor(() =>
      expect(
        compositeFactControllerRecordCompositeOccurrence,
      ).toHaveBeenCalledOnce(),
    )
    expect(
      compositeFactControllerRecordCompositeOccurrence,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        component: { kind: 'or_variant', value: '1.20', variantId },
      }),
    )
  })

  it('names flexible checklist occurrence radio groups from the backend component', () => {
    const itemId = '33333333-3333-4333-8333-333333333333'
    render(
      <RecordFactActions
        goal={createGoal(
          {
            kind: 'checklist',
            items: [{ itemId, label: 'Прогулка' }],
          },
          [],
          [{ eligibleOnDate: true }],
        )}
        isOnline
        refetch={vi.fn(async () => undefined)}
        today={today}
      />,
    )

    expect(screen.getByRole('group', { name: 'Прогулка' })).toBeVisible()
  })

  it('routes checkpoint checklist items with exact checkpoint and item IDs', async () => {
    const checkpointId = '33333333-3333-4333-8333-333333333333'
    const itemId = '44444444-4444-4444-8444-444444444444'
    render(
      <RecordFactActions
        goal={createGoal(
          {
            kind: 'checklist',
            items: [{ itemId, label: 'Прогулка' }],
          },
          [{ componentId: checkpointId, componentKind: 'checkpoint' }],
          [],
          {
            aggregation: 'all',
            items: [
              {
                checkpointId,
                deadline: '18:00',
                name: 'Вечер',
                satisfaction: { kind: 'checklist' },
              },
            ],
          },
        )}
        isOnline
        refetch={vi.fn(async () => undefined)}
        today={today}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Записать' }))
    await waitFor(() =>
      expect(compositeFactControllerRecordChecklistItem).toHaveBeenCalledOnce(),
    )
    expect(compositeFactControllerRecordChecklistItem).toHaveBeenCalledWith(
      expect.objectContaining({ checklistItemId: itemId, checkpointId }),
    )
  })

  it('routes checkpoint OR variants with exact checkpoint and variant IDs', async () => {
    const checkpointId = '33333333-3333-4333-8333-333333333333'
    const variantId = '44444444-4444-4444-8444-444444444444'
    render(
      <RecordFactActions
        goal={createGoal(
          {
            kind: 'any_of',
            variants: [
              {
                label: 'Стаканы',
                precision: 2,
                target: '2',
                unit: 'шт',
                variantId,
              },
            ],
          },
          [{ componentId: checkpointId, componentKind: 'checkpoint' }],
          [],
          {
            aggregation: 'all',
            items: [
              {
                checkpointId,
                deadline: '18:00',
                name: 'Вечер',
                satisfaction: { kind: 'any_of' },
              },
            ],
          },
        )}
        isOnline
        refetch={vi.fn(async () => undefined)}
        today={today}
      />,
    )

    fireEvent.change(screen.getByLabelText('Вечер · Стаканы (шт)'), {
      target: { value: '1.20' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Записать' }))
    await waitFor(() =>
      expect(compositeFactControllerRecordOrVariant).toHaveBeenCalledOnce(),
    )
    expect(compositeFactControllerRecordOrVariant).toHaveBeenCalledWith(
      expect.objectContaining({ checkpointId, value: '1.20', variantId }),
    )
  })

  it('keeps an open draft mounted and read-only while offline', () => {
    const { rerender } = render(
      <RecordFactActions
        goal={createGoal({ kind: 'text' }, [
          { componentId: null, componentKind: 'goal' },
        ])}
        isOnline
        refetch={vi.fn()}
        today={today}
      />,
    )
    const text = screen.getByLabelText('Текстовый факт')
    fireEvent.change(text, { target: { value: 'Черновик' } })

    rerender(
      <RecordFactActions
        goal={createGoal({ kind: 'text' }, [
          { componentId: null, componentKind: 'goal' },
        ])}
        isOnline={false}
        refetch={vi.fn()}
        today={today}
      />,
    )
    expect(screen.getByLabelText('Текстовый факт')).toHaveValue('Черновик')
    expect(screen.getByLabelText('Текстовый факт')).toBeDisabled()
    expect(screen.queryByText('Записать')).not.toBeInTheDocument()
  })

  it('offers explicit abandon for an unknown composite result', async () => {
    vi.mocked(compositeFactControllerRecordText).mockRejectedValueOnce(
      new ApiNetworkError(),
    )
    render(
      <RecordFactActions
        goal={createGoal({ kind: 'text' }, [
          { componentId: null, componentKind: 'goal' },
        ])}
        isOnline
        refetch={vi.fn()}
        today={today}
      />,
    )
    fireEvent.change(screen.getByLabelText('Текстовый факт'), {
      target: { value: 'Неизвестный результат' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Записать' }))
    await waitFor(() =>
      expect(screen.getByText(/Результат не подтверждён/)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Отменить' }))
    expect(
      screen.queryByText(/Результат не подтверждён/),
    ).not.toBeInTheDocument()
  })
})
