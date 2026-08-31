import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'

import { canViewRecordFactSurface } from '../model/record-fact-access'
import { RecordFactCheckpoints } from './record-fact-checkpoints'
import { RecordFactMeasurement } from './record-fact-measurement'

export function RecordFactActions({
  goal,
  today,
  isOnline,
  canMutate = isOnline,
  refetch,
}: Readonly<{
  canMutate?: boolean
  goal: TrackingGoalPresentation
  isOnline: boolean
  refetch: () => Promise<unknown>
  today: PublishedTodayPresentation
}>) {
  if (!canViewRecordFactSurface(today, goal)) return null

  return (
    <section
      className="mt-5 border-t border-border/70 pt-4"
      aria-label={`Ввод фактов: ${goal.title}`}
    >
      <p className="mb-3 text-xs font-medium text-muted-foreground">
        Записать факт
      </p>
      <div className="grid gap-3">
        <RecordFactMeasurement
          canMutate={canMutate}
          goal={goal}
          isOnline={isOnline}
          refetch={refetch}
          today={today}
        />
        <RecordFactCheckpoints
          canMutate={canMutate}
          goal={goal}
          isOnline={isOnline}
          refetch={refetch}
          today={today}
        />
      </div>
    </section>
  )
}
