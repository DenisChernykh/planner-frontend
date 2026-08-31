import { RefreshCcw } from 'lucide-react'

import type { TrackingTodayPresentation } from '@/entities/tracking'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from '@/shared/ui'

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
