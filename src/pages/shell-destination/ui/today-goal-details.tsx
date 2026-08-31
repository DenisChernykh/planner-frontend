import type { TrackingGoalPresentation } from '@/entities/tracking'
import { formatProductDateLabel } from '@/shared/lib/date'
import { Badge } from '@/shared/ui'

const goalStateLabels = {
  filled: 'Заполнено',
  future: 'Будущее',
  no_data: 'Нет данных',
  not_applicable: 'Не применяется',
  partial: 'Частично',
} as const

const expectationStateLabels = {
  done: 'Выполнено',
  no_data: 'Нет данных',
  not_done: 'Не выполнено',
  partial: 'Частично',
} as const

const componentKindLabels = {
  checklist_item: 'Пункт списка',
  checkpoint: 'Контрольная точка',
  goal: 'Цель',
} as const

const periodKindLabels = {
  monthly: 'Месячная квота',
  weekly: 'Недельная квота',
  weekly_planned_task: 'Задача недели',
} as const

function formatFactsCount(count: number) {
  if (count === 1) return '1 факт'
  if (count > 1 && count < 5) return `${count} факта`
  return `${count} фактов`
}

function FixedExpectations({
  goal,
}: Readonly<{ goal: TrackingGoalPresentation }>) {
  if (goal.day.fixedExpectations.length === 0) return null

  return (
    <section aria-label="Фиксированные ожидания" className="mt-5">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Фиксированные ожидания
      </h3>
      <ul className="mt-2 grid gap-2">
        {goal.day.fixedExpectations.map((expectation) => (
          <li
            key={expectation.fixedExpectationId}
            className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-border pl-3 text-sm"
          >
            <span>{componentKindLabels[expectation.componentKind]}</span>
            <span className="flex items-center gap-2">
              <Badge variant="outline">
                {expectationStateLabels[expectation.state]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatFactsCount(expectation.facts.length)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function FlexiblePeriods({
  goal,
}: Readonly<{ goal: TrackingGoalPresentation }>) {
  if (goal.day.flexiblePeriods.length === 0) return null

  const periods = goal.day.flexiblePeriods.toSorted(
    (left, right) => left.ordinal - right.ordinal,
  )

  return (
    <section aria-label="Гибкий прогресс" className="mt-5">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Гибкий прогресс
      </h3>
      <ul className="mt-2 grid gap-2">
        {periods.map((period) => (
          <li
            key={period.flexiblePeriodId}
            className="grid gap-1 border-l-2 border-border pl-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <span>
              {periodKindLabels[period.periodKind]} ·{' '}
              {formatProductDateLabel(period.periodStart)} —{' '}
              {formatProductDateLabel(period.periodEnd)}
            </span>
            <span className="flex items-center gap-2 sm:justify-self-end">
              <Badge variant="outline">{goalStateLabels[period.state]}</Badge>
              <span className="text-xs text-muted-foreground">
                {period.actualProgress === null
                  ? 'Прогресс недоступен'
                  : `${period.actualProgress.numerator}/${period.actualProgress.denominator}`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function TodayGoalLists({
  goal,
}: Readonly<{ goal: TrackingGoalPresentation }>) {
  return (
    <>
      <FixedExpectations goal={goal} />
      <FlexiblePeriods goal={goal} />
    </>
  )
}
