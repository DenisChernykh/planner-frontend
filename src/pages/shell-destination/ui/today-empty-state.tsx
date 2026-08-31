import type { TrackingTodayPresentation } from '@/entities/tracking'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui'

export function EmptyTodayState({
  data,
}: Readonly<{ data: TrackingTodayPresentation }>) {
  if (data.state === 'published') return null

  return (
    <Alert className="mt-6">
      <AlertTitle>
        {data.state === 'draft'
          ? 'План ещё не опубликован'
          : 'План на месяц ещё не создан'}
      </AlertTitle>
      <AlertDescription>
        {data.state === 'draft'
          ? 'Today показывает только подтверждённый черновик и остаётся в режиме просмотра до публикации.'
          : `Сегодня доступно в режиме просмотра. Когда план ${data.targetMonth} появится, здесь отобразятся его серверные ожидания.`}
      </AlertDescription>
    </Alert>
  )
}
