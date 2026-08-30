import { ApiProtocolError, type TrackingTodayResponseV1 } from '@/shared/api'

type NoPlanNavigationSource = Pick<
  Extract<TrackingTodayResponseV1, { state: 'no_plan' }>,
  'state' | 'targetMonth'
>
type DraftNavigationSource = Pick<
  Extract<TrackingTodayResponseV1, { state: 'draft' }>,
  'state' | 'targetMonth'
>
type PublishedNavigationSource = Pick<
  Extract<TrackingTodayResponseV1, { state: 'published' }>,
  'lifecycleMode' | 'monthStatus' | 'phase' | 'state' | 'targetMonth'
>

export type TrackingTodayNavigationSource =
  NoPlanNavigationSource | DraftNavigationSource | PublishedNavigationSource

export type TrackingNavigation =
  | Readonly<{
      lifecycleMode: null
      monthStatus: null
      phase: null
      state: 'no_plan' | 'draft'
      targetMonth: string
    }>
  | Readonly<{
      lifecycleMode: PublishedNavigationSource['lifecycleMode']
      monthStatus: PublishedNavigationSource['monthStatus']
      phase: PublishedNavigationSource['phase']
      state: 'published'
      targetMonth: string
    }>

export type RootDestination = Readonly<{
  kind: 'today' | 'plans' | 'statistics'
  targetMonth: string
}>

function assertPublishedLifecycle(
  today: PublishedNavigationSource,
): PublishedNavigationSource {
  const expectedMonthStatus =
    today.phase === 'future' || today.phase === 'active'
      ? 'published'
      : today.phase

  if (today.monthStatus !== expectedMonthStatus) {
    throw new ApiProtocolError()
  }

  if (
    today.lifecycleMode === 'reopened' &&
    (today.phase === 'future' || today.phase === 'active')
  ) {
    throw new ApiProtocolError()
  }

  return today
}

/** Removes day, goal and identifier payloads from AppShell navigation context. */
export function selectTrackingNavigation(
  today: TrackingTodayNavigationSource,
): TrackingNavigation {
  if (today.state !== 'published') {
    return Object.freeze({
      lifecycleMode: null,
      monthStatus: null,
      phase: null,
      state: today.state,
      targetMonth: today.targetMonth,
    })
  }

  const published = assertPublishedLifecycle(today)
  return Object.freeze({
    lifecycleMode: published.lifecycleMode,
    monthStatus: published.monthStatus,
    phase: published.phase,
    state: published.state,
    targetMonth: published.targetMonth,
  })
}

/** Selects a semantic destination; the router remains the owner of URL building. */
export function selectRootDestination(
  today: TrackingTodayNavigationSource,
): RootDestination {
  const navigation = selectTrackingNavigation(today)

  if (navigation.state !== 'published' || navigation.phase === 'future') {
    return Object.freeze({
      kind: 'plans',
      targetMonth: navigation.targetMonth,
    })
  }

  if (navigation.phase === 'active') {
    return Object.freeze({
      kind: 'today',
      targetMonth: navigation.targetMonth,
    })
  }

  return Object.freeze({
    kind: 'statistics',
    targetMonth: navigation.targetMonth,
  })
}
