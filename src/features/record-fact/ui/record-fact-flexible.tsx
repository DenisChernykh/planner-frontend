import type { TrackingGoalPresentation } from '@/entities/tracking'

import type { FactTarget } from '../model/record-fact-mappers'
import { CompositeOccurrenceForm } from './composite-occurrence-form'

export function RecordFactFlexible({
  canMutate,
  canRetry,
  goal,
  isOnline,
  refetch,
  target,
}: Readonly<{
  canMutate: boolean
  canRetry: boolean
  goal: TrackingGoalPresentation
  isOnline: boolean
  refetch: () => Promise<unknown>
  target: FactTarget
}>) {
  if (!goal.day.flexiblePeriods.some((period) => period.eligibleOnDate)) {
    return null
  }
  const measurement = goal.config?.measurement
  if (measurement?.kind === 'checklist') {
    return (
      <>
        {measurement.items.map((item) => (
          <CompositeOccurrenceForm
            canMutate={canMutate}
            canRetry={canRetry}
            component={{
              kind: 'checklist_item',
              itemId: item.itemId,
              label: item.label,
            }}
            isOnline={isOnline}
            key={`flexible-checklist-${item.itemId}`}
            refetch={refetch}
            target={target}
          />
        ))}
      </>
    )
  }
  if (measurement?.kind === 'any_of') {
    return (
      <>
        {measurement.variants.map((variant) => (
          <CompositeOccurrenceForm
            canMutate={canMutate}
            canRetry={canRetry}
            component={{
              kind: 'or_variant',
              label: variant.label,
              precision: variant.precision,
              unit: variant.unit,
              variantId: variant.variantId,
            }}
            isOnline={isOnline}
            key={`flexible-or-${variant.variantId}`}
            refetch={refetch}
            target={target}
          />
        ))}
      </>
    )
  }
  return null
}
