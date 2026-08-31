import type {
  PublishedTodayPresentation,
  TrackingGoalPresentation,
} from '@/entities/tracking'
import { RecordFactActions } from '@/features/record-fact'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui'

import { TodayGoalLists } from './today-goal-details'

const accessLabels = {
  personal_owner: 'Личная · моя',
  partner_read_only: 'Личная · только чтение',
  shared: 'Общая',
} as const

const goalStateLabels = {
  filled: 'Заполнено',
  future: 'Будущее',
  no_data: 'Нет данных',
  not_applicable: 'Не применяется',
  partial: 'Частично',
} as const

const metricReasonLabels = {
  informational: 'Информационное значение',
  no_applicable_units: 'Нет применимых единиц',
} as const

function formatMetric(
  metric: TrackingGoalPresentation['progress']['progress'],
) {
  if (!metric.available)
    return metricReasonLabels[metric.reason] ?? metric.reason
  return `${metric.exact.numerator}/${metric.exact.denominator}`
}

export function TodayGoalCard({
  goal,
  isOnline,
  refetch,
  today,
}: Readonly<{
  goal: TrackingGoalPresentation
  isOnline: boolean
  refetch: () => Promise<unknown>
  today: PublishedTodayPresentation
}>) {
  return (
    <article>
      <Card className="h-full">
        <CardHeader className="gap-2 border-b border-border/70 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base leading-6">
                {goal.title}
              </CardTitle>
              <CardDescription className="mt-1">
                {goal.category}
              </CardDescription>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <Badge variant="secondary">
                {accessLabels[goal.viewerAccess]}
              </Badge>
              <Badge variant="outline">
                {goal.day.applicable ? 'Применимо' : 'Не применяется'}
              </Badge>
              <Badge variant="outline">{goalStateLabels[goal.day.state]}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Покрытие</dt>
              <dd className="mt-1 font-medium">
                {goal.day.coverage.filled} / {goal.day.coverage.applicable}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Прогресс</dt>
              <dd className="mt-1 font-medium">
                {formatMetric(goal.progress.progress)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {goal.day.writable
              ? 'Ввод разрешён сервером для применимых ожиданий.'
              : goal.viewerAccess === 'partner_read_only'
                ? 'Эта личная цель принадлежит партнёру и доступна только для просмотра.'
                : 'Изменения сейчас недоступны для этой цели.'}
          </p>
          <TodayGoalLists goal={goal} />
          <RecordFactActions
            goal={goal}
            isOnline={isOnline}
            refetch={refetch}
            today={today}
          />
        </CardContent>
      </Card>
    </article>
  )
}
