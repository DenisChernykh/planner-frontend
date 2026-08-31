import { CheckpointBooleanForm } from './checkpoint-boolean-form'
import { CheckpointRatingForm } from './checkpoint-rating-form'
import { CheckpointTimeForm } from './checkpoint-time-form'
import type { FactTarget } from '../model/record-fact-mappers'

export type CheckpointKind = 'boolean' | 'actual_time' | 'rating'

export type CheckpointFactFormProps = Readonly<{
  canMutate: boolean
  checkpointId: string
  isOnline: boolean
  kind: CheckpointKind
  label: string
  maximum?: number
  minimum?: number
  refetch: () => Promise<unknown>
  target: FactTarget
}>

export function CheckpointFactForm(props: CheckpointFactFormProps) {
  if (props.kind === 'boolean') return <CheckpointBooleanForm {...props} />
  if (props.kind === 'actual_time') return <CheckpointTimeForm {...props} />
  return <CheckpointRatingForm {...props} />
}
