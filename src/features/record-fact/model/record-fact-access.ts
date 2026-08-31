import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'

/** Access is a projection of server decisions; the client does not infer ownership. */
export function canViewRecordFactSurface(
  today: PublishedTodayPresentation,
  goal: TrackingGoalPresentation,
) {
  return (
    today.phase === 'active' &&
    today.monthStatus === 'published' &&
    today.day.closure.state === 'open' &&
    goal.viewerAccess !== 'partner_read_only' &&
    goal.day.applicable &&
    goal.day.writable &&
    goal.day.state !== 'future' &&
    goal.day.state !== 'not_applicable'
  )
}

export function canRecordFact(
  today: PublishedTodayPresentation,
  goal: TrackingGoalPresentation,
  isOnline: boolean,
) {
  return isOnline && canViewRecordFactSurface(today, goal)
}
