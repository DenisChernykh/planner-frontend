import { productDateSchema } from '@/shared/lib/date'

const returnToStorageKey = 'planner.return-to.v1'
const maxReturnToLength = 2048
const returnToBaseOrigin = 'https://planner.invalid'

const ambiguousPathEncodingPattern = /%(?:25|2e|2f|5c)/iu
const targetMonthSource =
  '(?:[1-9]\\d{3}|0[1-9]\\d{2}|00[1-9]\\d|000[1-9])-(?:0[1-9]|1[0-2])'
const monthDayPathPattern = new RegExp(
  `^/months/(?<targetMonth>${targetMonthSource})/days/(?<localDate>\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01]))$`,
  'u',
)

const protectedRoutePatterns = [
  /^\/$/u,
  /^\/today$/u,
  new RegExp(`^/months/${targetMonthSource}$`, 'u'),
  monthDayPathPattern,
  /^\/plans$/u,
  /^\/plans\/new$/u,
  new RegExp(`^/plans/${targetMonthSource}/(?:edit|preview)$`, 'u'),
  new RegExp(`^/plans/${targetMonthSource}/goals/new$`, 'u'),
  /^\/plans\/catalog$/u,
  /^\/plans\/catalog\/new$/u,
  new RegExp(`^/statistics/${targetMonthSource}$`, 'u'),
  /^\/settings$/u,
]

function isCanonicalPathname(value: string) {
  if (value.includes('\\') || ambiguousPathEncodingPattern.test(value)) {
    return false
  }

  try {
    decodeURI(value)

    const normalizedUrl = new URL(value, returnToBaseOrigin)
    return (
      normalizedUrl.origin === returnToBaseOrigin &&
      normalizedUrl.pathname === value &&
      normalizedUrl.search.length === 0 &&
      normalizedUrl.hash.length === 0
    )
  } catch {
    return false
  }
}

function hasCanonicalMonthDay(value: string) {
  const match = monthDayPathPattern.exec(value)
  if (match?.groups === undefined) return true

  const { localDate, targetMonth } = match.groups
  return (
    localDate !== undefined &&
    targetMonth !== undefined &&
    localDate.startsWith(`${targetMonth}-`) &&
    productDateSchema.safeParse(localDate).success
  )
}

/** Возвращает только разрешённый protected pathname для OIDC return. */
export function sanitizeReturnTo(value: string | null | undefined) {
  if (
    value === null ||
    value === undefined ||
    value.length === 0 ||
    value.length > maxReturnToLength ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('?') ||
    value.includes('#') ||
    !isCanonicalPathname(value) ||
    !hasCanonicalMonthDay(value)
  ) {
    return null
  }

  return protectedRoutePatterns.some((pattern) => pattern.test(value))
    ? value
    : null
}

/** Сохраняет pathname только в момент явного начала Telegram OIDC. */
export function storeReturnTo(storage: Storage, value: string) {
  const safeValue = sanitizeReturnTo(value)
  if (safeValue === null) {
    storage.removeItem(returnToStorageKey)
    return false
  }

  storage.setItem(returnToStorageKey, safeValue)
  return true
}

/** Одноразово читает и удаляет сохранённый pathname до navigation. */
export function consumeReturnTo(storage: Storage) {
  const value = storage.getItem(returnToStorageKey)
  storage.removeItem(returnToStorageKey)
  return sanitizeReturnTo(value)
}

export function clearReturnTo(storage: Storage) {
  storage.removeItem(returnToStorageKey)
}
