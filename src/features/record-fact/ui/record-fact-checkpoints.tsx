import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'

import { CheckpointFactForm } from './checkpoint-fact-form'
import { ChecklistItemFactForm } from './checklist-item-fact-form'
import { OrVariantFactForm } from './or-variant-fact-form'
import { TextFactForm } from './text-fact-form'

function checkpointIsExpected(
  goal: TrackingGoalPresentation,
  checkpointId: string,
) {
  return goal.day.fixedExpectations.some(
    (expectation) =>
      expectation.componentKind === 'checkpoint' &&
      expectation.componentId === checkpointId,
  )
}

export function RecordFactCheckpoints({
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
  const checkpoints = goal.config.checkpoints?.items ?? []
  const target = {
    localDate: today.queryLocalDate,
    planGoalSnapshotId: goal.planGoalSnapshotId,
    publicationId: today.publicationId,
  } as const
  if (goal.config?.measurement === undefined) return null
  const ratingMeasurement =
    goal.config.measurement.kind === 'rating'
      ? goal.config.measurement
      : undefined
  const measurement = goal.config.measurement

  return (
    <>
      {checkpoints.map((checkpoint) => {
        const kind = checkpoint.satisfaction.kind
        if (!checkpointIsExpected(goal, checkpoint.checkpointId)) {
          return null
        }
        if (kind === 'boolean' || kind === 'actual_time' || kind === 'rating') {
          return (
            <CheckpointFactForm
              checkpointId={checkpoint.checkpointId}
              isOnline={isOnline}
              key={checkpoint.checkpointId}
              kind={kind}
              label={`${checkpoint.name} · до ${checkpoint.deadline}`}
              maximum={ratingMeasurement?.maximum}
              minimum={ratingMeasurement?.minimum}
              refetch={refetch}
              target={target}
            />
          )
        }
        if (kind === 'text') {
          return (
            <TextFactForm
              checkpointId={checkpoint.checkpointId}
              isOnline={isOnline}
              key={checkpoint.checkpointId}
              label={`${checkpoint.name} · до ${checkpoint.deadline}`}
              refetch={refetch}
              target={target}
            />
          )
        }
        if (kind === 'checklist' && measurement.kind === 'checklist') {
          return (
            <div className="grid gap-2" key={checkpoint.checkpointId}>
              {measurement.items.map((item) => (
                <ChecklistItemFactForm
                  checkpointId={checkpoint.checkpointId}
                  itemId={item.itemId}
                  isOnline={isOnline}
                  key={item.itemId}
                  label={`${checkpoint.name} · ${item.label}`}
                  refetch={refetch}
                  target={target}
                />
              ))}
            </div>
          )
        }
        if (kind === 'any_of' && measurement.kind === 'any_of') {
          return (
            <div className="grid gap-2" key={checkpoint.checkpointId}>
              {measurement.variants.map((variant) => (
                <OrVariantFactForm
                  checkpointId={checkpoint.checkpointId}
                  isOnline={isOnline}
                  key={variant.variantId}
                  label={`${checkpoint.name} · ${variant.label}`}
                  precision={variant.precision}
                  refetch={refetch}
                  target={target}
                  unit={variant.unit}
                  variantId={variant.variantId}
                />
              ))}
            </div>
          )
        }
        return null
      })}
    </>
  )
}
