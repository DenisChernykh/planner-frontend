import { useEffect } from 'react'
import { useBlocker, useInRouterContext } from 'react-router'

import { useRecordFactIntentScopeState } from '@/features/record-fact'
import { Alert, AlertDescription, AlertTitle, Button } from '@/shared/ui'

export function TodayRecordFactNavigationGuard() {
  const inRouter = useInRouterContext()
  if (!inRouter) return null
  return <TodayRecordFactNavigationGuardInner />
}

function TodayRecordFactNavigationGuardInner() {
  const scope = useRecordFactIntentScopeState()
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!scope.hasBlockingIntents) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [scope.hasBlockingIntents])
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      scope.hasBlockingIntents &&
      currentLocation.pathname !== nextLocation.pathname,
  )

  if (blocker.state !== 'blocked') return null

  const canLeave = !scope.hasPendingIntents
  return (
    <Alert className="mt-6" role="alert">
      <AlertTitle>Ввод факта ещё не завершён</AlertTitle>
      <AlertDescription>
        {canLeave
          ? 'Неизвестный результат хранится только в памяти. Отмена удалит его без повторной отправки.'
          : 'Дождитесь завершения запроса, чтобы безопасно покинуть Today.'}
      </AlertDescription>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={blocker.reset}>
          Остаться
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={!canLeave}
          onClick={() => {
            scope.abandonAll()
            blocker.proceed()
          }}
        >
          Уйти и отменить
        </Button>
      </div>
    </Alert>
  )
}
