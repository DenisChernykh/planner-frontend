import type { TrackingGoalPresentation } from '@/entities/tracking'

import type { FactTarget } from '../model/record-fact-mappers'
import { ChecklistItemFactForm } from './checklist-item-fact-form'
import { OrVariantFactForm } from './or-variant-fact-form'
import { RecordFactFlexible } from './record-fact-flexible'

type Measurement = NonNullable<
  TrackingGoalPresentation['config']['measurement']
>
export type CompositeMeasurement = Extract<
  Measurement,
  { kind: 'checklist' | 'any_of' }
>

export function RecordFactCompositeMeasurement({
  canMutate,
  canRetry,
  goal,
  isOnline,
  measurement,
  refetch,
  target,
}: Readonly<{
  canMutate: boolean
  canRetry: boolean
  goal: TrackingGoalPresentation
  isOnline: boolean
  measurement: CompositeMeasurement
  refetch: () => Promise<unknown>
  target: FactTarget
}>) {
  const isFixedItem = (itemId: string) =>
    goal.day.fixedExpectations.some(
      (expectation) =>
        expectation.componentKind === 'checklist_item' &&
        expectation.componentId === itemId,
    )
  const hasFixedGoalExpectation = goal.day.fixedExpectations.some(
    (expectation) =>
      expectation.componentKind === 'goal' && expectation.componentId === null,
  )

  if (measurement.kind === 'checklist') {
    return (
      <>
        {measurement.items
          .filter((item) => isFixedItem(item.itemId))
          .map((item) => (
            <ChecklistItemFactForm
              canMutate={canMutate}
              canRetry={canRetry}
              itemId={item.itemId}
              isOnline={isOnline}
              key={item.itemId}
              label={item.label}
              refetch={refetch}
              target={target}
            />
          ))}
        <RecordFactFlexible
          canMutate={canMutate}
          canRetry={canRetry}
          goal={goal}
          isOnline={isOnline}
          refetch={refetch}
          target={target}
        />
      </>
    )
  }

  return (
    <>
      {measurement.variants
        .filter(() => hasFixedGoalExpectation)
        .map((variant) => (
          <OrVariantFactForm
            canMutate={canMutate}
            canRetry={canRetry}
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
        canMutate={canMutate}
        canRetry={canRetry}
        goal={goal}
        isOnline={isOnline}
        refetch={refetch}
        target={target}
      />
    </>
  )
}
