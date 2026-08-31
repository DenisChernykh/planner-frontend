export const rootPath = '/'
export const loginPath = '/login'
export const telegramLoginStartPath = '/auth/telegram/start'
export const telegramResultPath = '/auth/telegram/result'
export const todayPath = '/today'
export const plansPath = '/plans'
export const settingsPath = '/settings'

export function monthPath(targetMonth: string) {
  return `/months/${targetMonth}`
}

export function statisticsPath(targetMonth: string) {
  return `/statistics/${targetMonth}`
}
