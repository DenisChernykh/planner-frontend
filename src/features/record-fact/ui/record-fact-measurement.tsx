import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'

import { ActualTimeFactForm } from './actual-time-fact-form'
import { BooleanFactForm } from './boolean-fact-form'
import { QuantityFactForm } from './quantity-fact-form'
import { RatingFactForm } from './rating-fact-form'
import { TextFactForm } from './text-fact-form'
import { RecordFactCompositeMeasurement } from './record-fact-composite-measurement'

export function RecordFactMeasurement({
  canMutate,
  goal,
  today,
  isOnline,
  refetch,
}: Readonly<{
  canMutate: boolean
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
  const hasFixedGoalExpectation = () =>
    goal.day.fixedExpectations.some(
      (expectation) =>
        expectation.componentKind === 'goal' &&
        expectation.componentId === null,
    )

  if (measurement.kind === 'boolean') {
    return (
      <BooleanFactForm
        canMutate={canMutate}
        isOnline={isOnline}
        refetch={refetch}
        target={target}
      />
    )
  }
  if (measurement.kind === 'quantity') {
    return (
      <QuantityFactForm
        aggregation={measurement.aggregation}
        canMutate={canMutate}
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
        canMutate={canMutate}
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
        canMutate={canMutate}
        isOnline={isOnline}
        maximum={measurement.maximum}
        minimum={measurement.minimum}
        refetch={refetch}
        target={target}
      />
    )
  }
  if (measurement.kind === 'text') {
    if (!hasFixedGoalExpectation()) return null
    return (
      <TextFactForm
        canMutate={canMutate}
        isOnline={isOnline}
        refetch={refetch}
        target={target}
      />
    )
  }
  if (measurement.kind === 'checklist' || measurement.kind === 'any_of') {
    return (
      <RecordFactCompositeMeasurement
        canMutate={canMutate}
        goal={goal}
        isOnline={isOnline}
        measurement={measurement}
        refetch={refetch}
        target={target}
      />
    )
  }
  return null
}
