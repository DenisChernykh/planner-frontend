import type { TrackingTodayPresentation } from '@/entities/tracking'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'

import { TodayGoalCard } from './today-goal-card'

const dayStateLabels = {
  filled: 'Заполнен',
  future: 'Будущее',
  no_data: 'Нет данных',
  not_applicable: 'Нет применимых ожиданий',
  partial: 'Частично заполнен',
} as const

export function PublishedTodayContent({
  canMutate,
  canRetry,
  data,
  isOnline,
  refetch,
}: Readonly<{
  canMutate: boolean
  canRetry: boolean
  data: Extract<TrackingTodayPresentation, { state: 'published' }>
  isOnline: boolean
  refetch: () => Promise<unknown>
}>) {
  const coverage = `${data.day.coverage.filled} / ${data.day.coverage.applicable}`

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="gap-2 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Состояние дня</CardTitle>
            <Badge variant="outline">{dayStateLabels[data.day.state]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Серверная дата активного дня: {data.activeLocalDate}
          </p>
        </CardHeader>
        <CardContent className="border-t border-border/70 pt-4">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Покрытие дня</dt>
              <dd className="mt-1 font-medium">{coverage}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Закрытие</dt>
              <dd className="mt-1 font-medium">
                {data.day.closure.state === 'closed'
                  ? 'День закрыт'
                  : 'День открыт'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Revision фактов</dt>
              <dd className="mt-1 font-medium">{data.factsRevision}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <section className="mt-8" aria-labelledby="today-goals-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="today-goals-title"
              className="text-xl font-semibold tracking-tight"
            >
              Цели дня
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Порядок и доступы получены от сервера.
            </p>
          </div>
          <Badge variant="outline">{data.goals.length} целей</Badge>
        </div>
        {data.goals.length === 0 ? (
          <Card className="mt-4 border-dashed">
            <CardContent className="py-8 text-sm text-muted-foreground">
              На эту дату нет применимых целей.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {data.goals.map((goal) => (
              <TodayGoalCard
                canMutate={canMutate}
                canRetry={canRetry}
                goal={goal}
                isOnline={isOnline}
                key={goal.planGoalSnapshotId}
                refetch={refetch}
                today={data}
              />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
