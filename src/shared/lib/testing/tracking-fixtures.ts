import { HttpResponse, http, type HttpHandler } from 'msw'

import {
  CompositeFactControllerRecordChecklistItemBody,
  CompositeFactControllerRecordCompositeOccurrenceBody,
  CompositeFactControllerRecordOrVariantBody,
  CompositeFactControllerRecordTextBody,
  OPENAPI_CONTRACT_SOURCE,
  ScalarFactControllerRecordCheckpointBody,
  ScalarFactControllerRecordFactBody,
  ScalarFactControllerRecordRatingBody,
  ScalarFactControllerRecordTimeBody,
  type TrackingFactMutationResponseV1Dto,
  type TrackingTodayResponseV1,
} from '@/shared/api'

type TrackingTodayPublished = Extract<
  TrackingTodayResponseV1,
  { state: 'published' }
>
type TrackingGoalRead = TrackingTodayPublished['goals'][number]
type TrackingDayGoal = TrackingTodayPublished['day']['goals'][number]
type TrackingFixedExpectation = TrackingDayGoal['fixedExpectations'][number]
type TrackingFactRead = TrackingFixedExpectation['facts'][number]
type TrackingFlexiblePeriod = TrackingDayGoal['flexiblePeriods'][number]
type TrackingGoalProgress = TrackingGoalRead['progress']
type TrackingExactRatio = NonNullable<
  TrackingGoalProgress['contribution']['score']
>
type TrackingAvailableMetric = Extract<
  TrackingGoalProgress['progress'],
  { available: true }
>
type TrackingFactValue = NonNullable<TrackingFactRead['value']>
type PublishedGoalConfig = TrackingGoalRead['config']
type PublishedGoalMeasurement = PublishedGoalConfig['measurement']
type PublishedGoalScope = PublishedGoalConfig['scope']

const ids = {
  checklistItem: '11111111-1111-4111-8111-111111111111',
  command: '22222222-2222-4222-8222-222222222222',
  compositeFact: '33333333-3333-4333-8333-333333333333',
  fact: '44444444-4444-4444-8444-444444444444',
  member: '55555555-5555-4555-8555-555555555555',
  orVariant: '66666666-6666-4666-8666-666666666666',
  personalGoal: '77777777-7777-4777-8777-777777777777',
  planMonth: '88888888-8888-4888-8888-888888888888',
  publication: '99999999-9999-4999-8999-999999999999',
  series: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  sharedGoal: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  textFact: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  partnerGoal: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
} as const

const exactRatio = (
  numerator = '1',
  denominator = '2',
): TrackingExactRatio => ({ denominator, numerator })

const availableMetric = (): TrackingAvailableMetric => ({
  available: true,
  basisPoints: '5000',
  exact: exactRatio(),
})

function goalProgress(): TrackingGoalProgress {
  return {
    contribution: {
      coverage: { applicable: '2', filled: '1' },
      score: exactRatio(),
    },
    coverage: { applicable: '2', filled: '1' },
    formulaVersions: {
      calendar: 'planner.calendar-targets.v1',
      evaluation: 'planner.goal-evaluation.v1',
    },
    overperformance: availableMetric(),
    periods: [
      {
        actualEquivalentOccurrences: exactRatio(),
        creditedOccurrences: exactRatio(),
        overperformanceOccurrences: exactRatio('0'),
        periodEnd: '2026-08-30',
        periodStart: '2026-08-24',
        periodTarget: '2',
      },
    ],
    progress: availableMetric(),
    score: availableMetric(),
  }
}

const fixedCalendar: TrackingGoalRead['calendar'] = {
  activeLocalDate: '2026-08-30',
  expectationDates: ['2026-08-30'],
  kind: 'fixed',
  targetMonth: '2026-08',
  timeZone: 'Asia/Yekaterinburg',
}

function goalConfig(
  measurement: PublishedGoalMeasurement,
  scope: PublishedGoalScope,
): PublishedGoalConfig {
  return {
    checkpoints: null,
    measurement,
    repetition: { kind: 'daily' },
    schemaVersion: 1,
    scope,
  }
}

function goalRead(
  planGoalSnapshotId: string,
  title: string,
  viewerAccess: TrackingGoalRead['viewerAccess'],
  displayOrder: number,
  config: PublishedGoalConfig,
): TrackingGoalRead {
  return {
    calendar: fixedCalendar,
    category: 'Здоровье',
    config,
    displayOrder,
    planGoalSnapshotId,
    progress: goalProgress(),
    sourceGoalSeriesId: ids.series,
    title,
    viewerAccess,
    why: 'Поддерживать устойчивый ежедневный ритм.',
  }
}

function factRead(
  factKind: TrackingFactRead['factKind'],
  factRecordId: string,
  value: TrackingFactValue,
  checklistItemId: string | null = null,
  orVariantId: string | null = null,
): TrackingFactRead {
  return {
    checklistItemId,
    contributionId: null,
    factKind,
    factRecordId,
    orVariantId,
    recordedByMemberId: ids.member,
    recordedBySystemActorId: null,
    revision: '1',
    revisionKind: 'recorded',
    value,
  }
}

function dayGoal(
  planGoalSnapshotId: string,
  state: TrackingDayGoal['state'],
  writable: boolean,
  fixedExpectations: TrackingDayGoal['fixedExpectations'],
  flexiblePeriods: TrackingFlexiblePeriod[],
): TrackingDayGoal {
  return {
    applicable: true,
    correctionWritable: false,
    coverage: { applicable: '1', filled: state === 'filled' ? '1' : '0' },
    fixedExpectations,
    flexiblePeriods,
    planGoalSnapshotId,
    progress: goalProgress(),
    state,
    writable,
  }
}

const personalGoal = goalRead(
  ids.personalGoal,
  'Осознанное дыхание',
  'personal_owner',
  0,
  goalConfig(
    { kind: 'boolean' },
    { kind: 'personal', ownerMemberId: ids.member },
  ),
)
const sharedGoal = goalRead(
  ids.sharedGoal,
  'Стаканы воды',
  'shared',
  1,
  goalConfig(
    {
      aggregation: 'add',
      kind: 'quantity',
      mode: 'targeted',
      precision: 1,
      target: '2.5',
      unit: 'литра',
    },
    { kind: 'shared' },
  ),
)
const partnerGoal = goalRead(
  ids.partnerGoal,
  'Вечерняя заметка',
  'partner_read_only',
  2,
  goalConfig({ kind: 'text' }, { kind: 'shared' }),
)

const personalDayGoal = dayGoal(
  ids.personalGoal,
  'filled',
  true,
  [
    {
      componentId: null,
      componentKind: 'goal',
      facts: [
        factRead('boolean', ids.fact, { kind: 'boolean', result: 'done' }),
      ],
      fixedExpectationId: ids.personalGoal,
      state: 'done',
    },
  ],
  [],
)
const sharedDayGoal = dayGoal(
  ids.sharedGoal,
  'partial',
  true,
  [],
  [
    {
      actualProgress: exactRatio(),
      eligibleOnDate: true,
      expectedProgress: 50,
      facts: [
        factRead('quantity_add', ids.compositeFact, {
          kind: 'quantity',
          value: '1.25',
        }),
      ],
      flexiblePeriodId: ids.sharedGoal,
      ordinal: 1,
      periodEnd: '2026-08-30',
      periodKind: 'weekly',
      periodStart: '2026-08-24',
      periodTarget: 2,
      state: 'partial',
    },
  ],
)
const partnerDayGoal = dayGoal(
  ids.partnerGoal,
  'not_applicable',
  false,
  [
    {
      componentId: null,
      componentKind: 'goal',
      facts: [
        factRead('text', ids.textFact, {
          kind: 'text',
          result: 'done',
          text: 'День завершён спокойно.',
        }),
      ],
      fixedExpectationId: ids.partnerGoal,
      state: 'not_done',
    },
  ],
  [],
)

const mixedTodayResponse = {
  activeLocalDate: '2026-08-30',
  day: {
    closure: {
      closedAt: null,
      closedCount: null,
      dayCloseId: null,
      revision: null,
      state: 'open',
    },
    coverage: { applicable: '3', filled: '1' },
    goals: [personalDayGoal, sharedDayGoal, partnerDayGoal],
    localDate: '2026-08-30',
    state: 'partial',
  },
  factsRevision: '17',
  focus: 'Сохранять ясный темп',
  goals: [personalGoal, sharedGoal, partnerGoal],
  latePublication: true,
  lifecycleMode: 'ordinary',
  lifecycleRevision: '3',
  monthStatus: 'published',
  phase: 'active',
  planMonthId: ids.planMonth,
  publicationId: ids.publication,
  publicationRevision: '2',
  queryLocalDate: '2026-08-30',
  schemaVersion: 'tracking.today.v1',
  state: 'published',
  targetMonth: '2026-08',
} satisfies TrackingTodayPublished

export const mixedTodayFixture = Object.freeze({
  contract: OPENAPI_CONTRACT_SOURCE,
  response: mixedTodayResponse,
})

const mutationResponse = {
  aggregateId: ids.fact,
  aggregateRevision: '18',
  kind: 'tracking.fact-record.v1',
} satisfies TrackingFactMutationResponseV1Dto

const scalarTarget = {
  localDate: '2026-08-30',
  planGoalSnapshotId: ids.personalGoal,
  publicationId: ids.publication,
} as const

const expectationTarget = {
  expectationDate: '2026-08-30',
  planGoalSnapshotId: ids.personalGoal,
  publicationId: ids.publication,
} as const

const scalarBooleanRequest = ScalarFactControllerRecordFactBody.parse({
  ...scalarTarget,
  commandId: ids.command,
  value: { kind: 'boolean', result: 'done' },
})
const scalarQuantityRequest = ScalarFactControllerRecordFactBody.parse({
  ...scalarTarget,
  commandId: ids.command,
  value: { kind: 'quantity', value: '1.25' },
})
const actualTimeRequest = ScalarFactControllerRecordTimeBody.parse({
  ...expectationTarget,
  commandId: ids.command,
  value: '08:30',
})
const ratingRequest = ScalarFactControllerRecordRatingBody.parse({
  ...expectationTarget,
  commandId: ids.command,
  value: 4,
})
const checkpointRequest = ScalarFactControllerRecordCheckpointBody.parse({
  checkpointId: ids.personalGoal,
  ...expectationTarget,
  commandId: ids.command,
  value: { kind: 'boolean', result: 'done' },
})
const textRequest = CompositeFactControllerRecordTextBody.parse({
  checkpointId: null,
  ...expectationTarget,
  commandId: ids.command,
  result: 'done',
  text: 'День завершён спокойно.',
})
const checklistItemRequest =
  CompositeFactControllerRecordChecklistItemBody.parse({
    checklistItemId: ids.checklistItem,
    checkpointId: null,
    ...expectationTarget,
    commandId: ids.command,
    state: 'done',
  })
const orVariantRequest = CompositeFactControllerRecordOrVariantBody.parse({
  checkpointId: null,
  ...expectationTarget,
  commandId: ids.command,
  value: '1.25',
  variantId: ids.orVariant,
})
const compositeOccurrenceRequest =
  CompositeFactControllerRecordCompositeOccurrenceBody.parse({
    ...scalarTarget,
    commandId: ids.command,
    component: {
      checklistItemId: ids.checklistItem,
      kind: 'checklist_item',
      state: 'done',
    },
  })

export const trackingFactMutationFixtures = Object.freeze({
  scalarBoolean: {
    path: '/tracking/facts',
    request: scalarBooleanRequest,
    response: mutationResponse,
  },
  scalarQuantity: {
    path: '/tracking/facts',
    request: scalarQuantityRequest,
    response: mutationResponse,
  },
  actualTime: {
    path: '/tracking/facts/time',
    request: actualTimeRequest,
    response: mutationResponse,
  },
  rating: {
    path: '/tracking/facts/rating',
    request: ratingRequest,
    response: mutationResponse,
  },
  checkpoint: {
    path: '/tracking/facts/checkpoint',
    request: checkpointRequest,
    response: mutationResponse,
  },
  text: {
    path: '/tracking/facts/text',
    request: textRequest,
    response: mutationResponse,
  },
  checklistItem: {
    path: '/tracking/facts/checklist-item',
    request: checklistItemRequest,
    response: mutationResponse,
  },
  orVariant: {
    path: '/tracking/facts/or-variant',
    request: orVariantRequest,
    response: mutationResponse,
  },
  compositeOccurrence: {
    path: '/tracking/facts/composite-occurrence',
    request: compositeOccurrenceRequest,
    response: mutationResponse,
  },
})

const scalarValidationError = {
  code: 'VALIDATION_FAILED',
  detail: 'Value does not match the published measurement.',
  errors: [
    {
      code: 'invalid_value',
      detail: 'Expected a non-negative decimal.',
      pointer: '/value',
    },
  ],
  instance: 'urn:fixture:m3-scalar-validation',
  requestId: 'm3-scalar-validation',
  status: 422,
  title: 'Validation failed',
  type: 'https://planner.example.test/problems/validation',
} as const
const compositeValidationError = {
  code: 'VALIDATION_FAILED',
  detail: 'Text is required.',
  errors: [
    {
      code: 'required',
      detail: 'Enter text.',
      pointer: '/text',
    },
  ],
  instance: 'urn:fixture:m3-composite-validation',
  requestId: 'm3-composite-validation',
  status: 422,
  title: 'Validation failed',
  type: 'https://planner.example.test/problems/validation',
} as const

export const trackingFactErrorFixtures = Object.freeze({
  scalarValidation: {
    path: '/tracking/facts',
    request: scalarQuantityRequest,
    response: scalarValidationError,
  },
  compositeValidation: {
    path: '/tracking/facts/text',
    request: textRequest,
    response: compositeValidationError,
  },
})

export const trackingFactRecoveryFixtures = Object.freeze({
  scalarNetworkRetry: {
    path: '/tracking/facts',
    request: scalarBooleanRequest,
    retryRequest: scalarBooleanRequest,
    response: mutationResponse,
  },
  compositeNetworkRetry: {
    path: '/tracking/facts/text',
    request: textRequest,
    retryRequest: textRequest,
    response: trackingFactMutationFixtures.text.response,
  },
})

/**
 * MSW handlers for the M3 source/integration gate. The scalar route models an
 * unknown network result followed by an explicit byte-equivalent retry; the
 * text route models a generated validation response.
 */
export function createM3TrackingHandlers(): HttpHandler[] {
  let scalarAttempts = 0

  return [
    http.get('*/api/tracking/today', () =>
      HttpResponse.json(mixedTodayFixture.response),
    ),
    http.post('*/api/tracking/facts', () => {
      scalarAttempts += 1
      if (scalarAttempts === 1) return HttpResponse.error()

      return HttpResponse.json(
        trackingFactMutationFixtures.scalarBoolean.response,
        {
          status: 201,
        },
      )
    }),
    http.post('*/api/tracking/facts/text', () =>
      HttpResponse.json(
        trackingFactErrorFixtures.compositeValidation.response,
        {
          status: 422,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      ),
    ),
  ]
}

export type M3TrackingTodayFixture = Readonly<{
  contract: typeof OPENAPI_CONTRACT_SOURCE
  response: TrackingTodayResponseV1
}>
