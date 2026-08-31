import type { TrackingTodayResponseV1 } from '@/shared/api'
import { formatProductDateLabel, PRODUCT_TIME_ZONE } from '@/shared/lib/date'

type NoPlanToday = Extract<TrackingTodayResponseV1, { state: 'no_plan' }>
type DraftToday = Extract<TrackingTodayResponseV1, { state: 'draft' }>
type PublishedToday = Extract<TrackingTodayResponseV1, { state: 'published' }>
type PublishedGoal = PublishedToday['goals'][number]
type DayGoal = PublishedToday['day']['goals'][number]

export type TrackingGoalPresentation = Readonly<{
  calendar: PublishedGoal['calendar']
  category: PublishedGoal['category']
  config: PublishedGoal['config']
  day: DayGoal
  displayOrder: PublishedGoal['displayOrder']
  planGoalSnapshotId: PublishedGoal['planGoalSnapshotId']
  progress: PublishedGoal['progress']
  sourceGoalSeriesId: PublishedGoal['sourceGoalSeriesId']
  title: PublishedGoal['title']
  viewerAccess: PublishedGoal['viewerAccess']
  why: PublishedGoal['why']
}>

type TodayPresentationBase = Readonly<{
  localDateLabel: string
  timeZone: typeof PRODUCT_TIME_ZONE
}>

export type NoPlanTodayPresentation = Readonly<
  NoPlanToday &
    TodayPresentationBase & {
      day: null
      goals: readonly []
    }
>

export type DraftTodayPresentation = Readonly<
  DraftToday &
    TodayPresentationBase & {
      day: null
      goals: readonly []
    }
>

export type PublishedTodayPresentation = Readonly<
  Omit<PublishedToday, 'goals'> &
    TodayPresentationBase & {
      goals: readonly TrackingGoalPresentation[]
    }
>

export type TrackingTodayPresentation =
  NoPlanTodayPresentation | DraftTodayPresentation | PublishedTodayPresentation

function freezeGoal(
  goal: PublishedGoal,
  dayGoal: DayGoal,
): TrackingGoalPresentation {
  return Object.freeze({
    calendar: goal.calendar,
    category: goal.category,
    config: goal.config,
    day: dayGoal,
    displayOrder: goal.displayOrder,
    planGoalSnapshotId: goal.planGoalSnapshotId,
    progress: goal.progress,
    sourceGoalSeriesId: goal.sourceGoalSeriesId,
    title: goal.title,
    viewerAccess: goal.viewerAccess,
    why: goal.why,
  })
}

function projectPublishedToday(
  today: PublishedToday,
): PublishedTodayPresentation {
  const dayGoals = new Map(
    today.day.goals.map((goal) => [goal.planGoalSnapshotId, goal]),
  )

  const goals = today.goals
    .flatMap((goal) => {
      const dayGoal = dayGoals.get(goal.planGoalSnapshotId)
      return dayGoal ? [freezeGoal(goal, dayGoal)] : []
    })
    .toSorted((left, right) => left.displayOrder - right.displayOrder)

  return Object.freeze({
    ...today,
    goals: Object.freeze(goals),
    localDateLabel: formatProductDateLabel(today.queryLocalDate),
    timeZone: PRODUCT_TIME_ZONE,
  })
}

/** Projects the full Today discriminant into a UI-safe, server-owned read model. */
export function selectTrackingTodayPresentation(
  today: TrackingTodayResponseV1,
): TrackingTodayPresentation {
  const base = {
    localDateLabel: formatProductDateLabel(today.queryLocalDate),
    timeZone: PRODUCT_TIME_ZONE,
  } as const

  if (today.state === 'published') return projectPublishedToday(today)

  return Object.freeze({
    ...today,
    ...base,
    day: null,
    goals: Object.freeze([] as const),
  })
}
