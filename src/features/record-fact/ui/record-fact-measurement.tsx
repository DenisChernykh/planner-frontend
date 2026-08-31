import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'

import { ActualTimeFactForm } from './actual-time-fact-form'
import { BooleanFactForm } from './boolean-fact-form'
import { ChecklistItemFactForm } from './checklist-item-fact-form'
import { RecordFactFlexible } from './record-fact-flexible'
import { QuantityFactForm } from './quantity-fact-form'
import { RatingFactForm } from './rating-fact-form'
import { TextFactForm } from './text-fact-form'
import { OrVariantFactForm } from './or-variant-fact-form'

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
  const isFixedItem = (itemId: string) =>
    goal.day.fixedExpectations.some(
      (expectation) =>
        expectation.componentKind === 'checklist_item' &&
        expectation.componentId === itemId,
    )
  const hasFixedGoalExpectation = () =>
    goal.day.fixedExpectations.some(
      (expectation) =>
        expectation.componentKind === 'goal' &&
        expectation.componentId === null,
    )

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
  if (measurement.kind === 'text') {
    if (!hasFixedGoalExpectation()) return null
    return (
      <TextFactForm isOnline={isOnline} refetch={refetch} target={target} />
    )
  }
  if (measurement.kind === 'checklist') {
    return (
      <>
        {measurement.items
          .filter((item) => isFixedItem(item.itemId))
          .map((item) => (
            <ChecklistItemFactForm
              itemId={item.itemId}
              isOnline={isOnline}
              key={item.itemId}
              label={item.label}
              refetch={refetch}
              target={target}
            />
          ))}
        <RecordFactFlexible
          goal={goal}
          isOnline={isOnline}
          refetch={refetch}
          target={target}
        />
      </>
    )
  }
  if (measurement.kind === 'any_of') {
    return (
      <>
        {measurement.variants
          .filter(() => hasFixedGoalExpectation())
          .map((variant) => (
            <OrVariantFactForm
              isOnline={isOnline}
              key={variant.variantId}
              label={variant.label}
              precision={variant.precision}
              refetch={refetch}
              target={target}
              unit={variant.unit}
              variantId={variant.variantId}
            />
          ))}
        <RecordFactFlexible
          goal={goal}
          isOnline={isOnline}
          refetch={refetch}
          target={target}
        />
      </>
    )
  }
  return null
}
