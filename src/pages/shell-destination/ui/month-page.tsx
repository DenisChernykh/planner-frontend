import { useParams } from 'react-router'

import { DestinationPage } from './destination-page'

const targetMonthPattern = /^\d{4}-(?:0[1-9]|1[0-2])$/u

export function MonthPage() {
  const { targetMonth = '' } = useParams()
  const safeTargetMonth = targetMonthPattern.test(targetMonth)
    ? targetMonth
    : 'некорректный месяц'

  return (
    <DestinationPage
      badge="Месяц"
      title={`Контекст ${safeTargetMonth}`}
      description="Месячный обзор будет собран из опубликованного backend-контракта без клиентского пересчёта правил."
    />
  )
}
