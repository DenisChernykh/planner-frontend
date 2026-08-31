import { useTrackingToday } from '@/entities/tracking'
import {
  RecordFactIntentScopeProvider,
  useRecordFactIntentScopeState,
} from '@/features/record-fact'
import { PRODUCT_TIME_ZONE } from '@/shared/lib/date'
import { useOnlineStatus } from '@/shared/lib/online-status'
import { Container, Spinner } from '@/shared/ui'

import {
  EmptyTodayState,
  PublishedTodayContent,
  TodayToolbar,
} from './today-state-surfaces'
import { TodayRecordFactNavigationGuard } from './today-record-fact-navigation-guard'
import { useRetainedTodayPresentation } from '../model/use-retained-today-presentation'

export function TodayPage() {
  const tracking = useTrackingToday()
  const { isOnline } = useOnlineStatus()

  return (
    <RecordFactIntentScopeProvider>
      <TodayPageContent isOnline={isOnline} tracking={tracking} />
    </RecordFactIntentScopeProvider>
  )
}

function TodayPageContent({
  isOnline,
  tracking,
}: Readonly<{
  isOnline: boolean
  tracking: ReturnType<typeof useTrackingToday>
}>) {
  const { hasBlockingIntents } = useRecordFactIntentScopeState()
  const data = useRetainedTodayPresentation(tracking.data, hasBlockingIntents)
  const hasRetainedSnapshot = hasBlockingIntents && tracking.data !== data
  const canMutate =
    isOnline &&
    !tracking.isFetching &&
    !tracking.isError &&
    !hasBlockingIntents &&
    !hasRetainedSnapshot
  const canRetry = isOnline && !tracking.isFetching && !tracking.isError

  if (data === undefined) {
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
        <TodayRecordFactNavigationGuard />
        <TodayToolbar
          data={data}
          isError={tracking.isError}
          isFetching={tracking.isFetching}
          isOnline={isOnline}
          onRefresh={() => void tracking.refetch()}
        />
        <EmptyTodayState data={data} />
        {data.state === 'published' && (
          <PublishedTodayContent
            canMutate={canMutate}
            canRetry={canRetry}
            data={data}
            isOnline={isOnline}
            refetch={async () => {
              await tracking.refetch({ throwOnError: true })
            }}
          />
        )}
        <p className="mt-8 text-xs text-muted-foreground">
          Все даты и локальные времена показываются в {PRODUCT_TIME_ZONE}.
        </p>
      </div>
    </Container>
  )
}
