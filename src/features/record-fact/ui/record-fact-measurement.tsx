import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'

import { ActualTimeFactForm } from './actual-time-fact-form'
import { BooleanFactForm } from './boolean-fact-form'
import { QuantityFactForm } from './quantity-fact-form'
import { RatingFactForm } from './rating-fact-form'

export function RecordFactMeasurement({
  goal,
  today,
  isOnline,
  refetch,
}: Readonly<{
  goal: TrackingGoalPresentation
  isOnline: boolean
  refetch: () => Promise<unknown>
  today: PublishedTodayPresentation
}>) {
  const target = {
    localDate: today.queryLocalDate,
    planGoalSnapshotId: goal.planGoalSnapshotId,
    publicationId: today.publicationId,
  } as const
  const measurement = goal.config?.measurement
  if (measurement === undefined) return null

  if (measurement.kind === 'boolean') {
    return (
      <BooleanFactForm isOnline={isOnline} refetch={refetch} target={target} />
    )
  }
  if (measurement.kind === 'quantity') {
    return (
      <QuantityFactForm
        aggregation={measurement.aggregation}
        isOnline={isOnline}
        precision={measurement.precision}
        refetch={refetch}
        target={target}
        unit={measurement.unit}
      />
    )
  }
  if (measurement.kind === 'actual_time') {
    return (
      <ActualTimeFactForm
        end={measurement.end}
        isOnline={isOnline}
        refetch={refetch}
        start={measurement.start}
        target={target}
      />
    )
  }
  if (measurement.kind === 'rating') {
    return (
      <RatingFactForm
        isOnline={isOnline}
        maximum={measurement.maximum}
        minimum={measurement.minimum}
        refetch={refetch}
        target={target}
      />
    )
  }
  return null
}
