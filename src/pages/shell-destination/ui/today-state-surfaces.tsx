import { RefreshCcw } from 'lucide-react'

import type { TrackingTodayPresentation } from '@/entities/tracking'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from '@/shared/ui'

import { TodayGoalCard } from './today-goal-card'

const phaseLabels = {
  active: 'Активный день',
  closed: 'Месяц закрыт',
  future: 'Будущий план',
  grace: 'Период завершения',
} as const

const monthStatusLabels = {
  closed: 'Закрыт',
  grace: 'Grace',
  published: 'Опубликован',
} as const

const dayStateLabels = {
  filled: 'Заполнен',
  future: 'Будущее',
  no_data: 'Нет данных',
  not_applicable: 'Нет применимых ожиданий',
  partial: 'Частично заполнен',
} as const

function targetMonthLabel(targetMonth: string) {
  return `Месяц ${targetMonth}`
}

function TodayReadStatus({
  isFetching,
  isOnline,
  isError,
}: Readonly<{
  isError: boolean
  isFetching: boolean
  isOnline: boolean
}>) {
  if (!isOnline) {
    return (
      <p className="mt-3 text-xs text-status-warning-foreground" role="status">
        Офлайн: показан последний подтверждённый просмотр. Обновление и ввод
        недоступны.
      </p>
    )
  }

  if (isFetching) {
    return (
      <p
        className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"
        role="status"
      >
        <Spinner className="size-3.5" aria-hidden="true" />
        Проверяем актуальное состояние…
      </p>
    )
  }

  if (isError) {
    return (
      <p className="mt-3 text-xs text-destructive" role="alert">
        Не удалось обновить просмотр. Ниже остаются последние подтверждённые
        данные.
      </p>
    )
  }

  return null
}

export function TodayToolbar({
  data,
  isError,
  isFetching,
  isOnline,
  onRefresh,
}: Readonly<{
  data: TrackingTodayPresentation
  isError: boolean
  isFetching: boolean
  isOnline: boolean
  onRefresh: () => void
}>) {
  const lifecycle =
    data.state === 'published'
      ? phaseLabels[data.phase]
      : data.state === 'draft'
        ? 'Черновик'
        : 'План не создан'

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge variant="secondary">Сегодня</Badge>
          <CardTitle className="mt-3 text-2xl tracking-tight sm:text-3xl">
            <time dateTime={data.queryLocalDate}>{data.localDateLabel}</time>
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            {targetMonthLabel(data.targetMonth)} · {data.timeZone}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!isOnline}
          isLoading={isFetching}
          loadingLabel="Обновление"
          onClick={onRefresh}
        >
          <RefreshCcw aria-hidden="true" />
          Обновить
        </Button>
      </CardHeader>
      <CardContent className="border-t border-border/70 pt-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{lifecycle}</Badge>
          {data.state === 'published' && (
            <Badge variant="outline">
              {monthStatusLabels[data.monthStatus]}
            </Badge>
          )}
          {data.state === 'published' && data.latePublication && (
            <Badge variant="outline">Опубликован с опозданием</Badge>
          )}
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {data.state === 'published'
            ? data.focus
            : data.state === 'draft'
              ? `Фокус черновика: ${data.focus}`
              : 'Для этого месяца ещё нет опубликованного плана.'}
        </p>
        <TodayReadStatus
          isError={isError}
          isFetching={isFetching}
          isOnline={isOnline}
        />
      </CardContent>
    </Card>
  )
}

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

export function PublishedTodayContent({
  data,
  isOnline,
  refetch,
}: Readonly<{
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
