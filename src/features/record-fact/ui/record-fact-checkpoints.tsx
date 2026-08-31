import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'

import { CheckpointFactForm } from './checkpoint-fact-form'

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

  return (
    <>
      {checkpoints.map((checkpoint) => {
        const kind = checkpoint.satisfaction.kind
        if (
          (kind !== 'boolean' && kind !== 'actual_time' && kind !== 'rating') ||
          !checkpointIsExpected(goal, checkpoint.checkpointId)
        ) {
          return null
        }
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
      })}
    </>
  )
}
