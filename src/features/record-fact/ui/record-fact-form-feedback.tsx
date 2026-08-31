import { Button } from '@/shared/ui'

import type { RecordFactIntentStatus } from '../model/use-record-fact-intent'

export function RecordFactFormFeedback({
  status,
  onRetry,
  isOnline,
}: Readonly<{
  isOnline: boolean
  onRetry: () => void
  status: RecordFactIntentStatus
}>) {
  if (status === 'success') {
    return (
      <p className="text-xs text-status-success-foreground" role="status">
        Сохранено. Today обновлён с сервера.
      </p>
    )
  }

  if (status === 'unknown') {
    return (
      <div className="flex flex-wrap items-center gap-2" role="alert">
        <p className="text-xs text-status-warning-foreground">
          Результат не подтверждён. Значение остаётся только в памяти.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!isOnline}
          onClick={onRetry}
        >
          Повторить
        </Button>
      </div>
    )
  }

  if (status === 'stale') {
    return (
      <p className="text-xs text-status-warning-foreground" role="alert">
        Данные изменились на сервере. Проверьте значение и подтвердите заново.
      </p>
    )
  }

  if (status === 'error') {
    return (
      <p className="text-xs text-destructive" role="alert">
        Не удалось сохранить значение. Проверьте соединение и данные.
      </p>
    )
  }

  return null
}
