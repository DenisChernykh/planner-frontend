import { useParams } from 'react-router'

import { DestinationPage } from './destination-page'

const targetMonthPattern = /^\d{4}-(?:0[1-9]|1[0-2])$/u

export function StatisticsPage() {
  const { targetMonth = '' } = useParams()
  const safeTargetMonth = targetMonthPattern.test(targetMonth)
    ? targetMonth
    : 'некорректный месяц'

  return (
    <DestinationPage
      badge="Статистика"
      title={`Итоги ${safeTargetMonth}`}
      description="Отчётные показатели придут с backend как готовые значения. AppShell не выводит их из локальных предположений."
    />
  )
}
