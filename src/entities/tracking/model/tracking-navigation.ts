import type { TrackingTodayResponseV1 } from '@/shared/api'

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

  return Object.freeze({
    lifecycleMode: today.lifecycleMode,
    monthStatus: today.monthStatus,
    phase: today.phase,
    state: today.state,
    targetMonth: today.targetMonth,
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
