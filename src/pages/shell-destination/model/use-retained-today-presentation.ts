import { useEffect, useState } from 'react'

import type {
  PublishedTodayPresentation,
  TrackingTodayPresentation,
} from '@/entities/tracking'

type LatestPublishedToday = Extract<
  TrackingTodayPresentation,
  { state: 'published' }
>

function selectPublishedToday(
  today: TrackingTodayPresentation | undefined,
): LatestPublishedToday | undefined {
  return today?.state === 'published' ? today : undefined
}

/**
 * Keeps the mounted published surface while a fact intent needs recovery.
 * The effect synchronizes the retained snapshot with the external Query
 * result only after the intent scope is no longer blocking.
 */
export function useRetainedTodayPresentation(
  today: TrackingTodayPresentation | undefined,
  hasBlockingIntents: boolean,
): TrackingTodayPresentation | undefined {
  const latestPublished = selectPublishedToday(today)
  const [retainedPublished, setRetainedPublished] = useState<
    PublishedTodayPresentation | undefined
  >(latestPublished)

  useEffect(() => {
    if (hasBlockingIntents) return
    // Intentional external-snapshot synchronization: release the retained
    // surface only after reconciliation or explicit abandon is complete.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRetainedPublished((previous) =>
      previous === latestPublished ? previous : latestPublished,
    )
  }, [hasBlockingIntents, latestPublished])

  return hasBlockingIntents && retainedPublished !== undefined
    ? retainedPublished
    : today
}
