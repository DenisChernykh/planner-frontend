import { useTrackingToday } from '@/entities/tracking'
import { PRODUCT_TIME_ZONE } from '@/shared/lib/date'
import { useOnlineStatus } from '@/shared/lib/online-status'
import { Container, Spinner } from '@/shared/ui'

import {
  EmptyTodayState,
  PublishedTodayContent,
  TodayToolbar,
} from './today-state-surfaces'

export function TodayPage() {
  const tracking = useTrackingToday()
  const { isOnline } = useOnlineStatus()

  if (tracking.data === undefined) {
    return (
      <Container as="section" className="py-8 sm:py-12">
        <div className="flex items-center gap-3 text-sm" role="status">
          <Spinner aria-hidden="true" />
          Загружаем Today…
        </div>
      </Container>
    )
  }

  return (
    <Container as="section" className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <TodayToolbar
          data={tracking.data}
          isError={tracking.isError}
          isFetching={tracking.isFetching}
          isOnline={isOnline}
          onRefresh={() => void tracking.refetch()}
        />
        <EmptyTodayState data={tracking.data} />
        {tracking.data.state === 'published' && (
          <PublishedTodayContent data={tracking.data} />
        )}
        <p className="mt-8 text-xs text-muted-foreground">
          Все даты и локальные времена показываются в {PRODUCT_TIME_ZONE}.
        </p>
      </div>
    </Container>
  )
}
