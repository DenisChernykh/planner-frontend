import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { ShieldCheck } from 'lucide-react'

import { TelegramLoginLink } from '@/features/telegram-login'
import { useOnlineStatus } from '@/shared/lib/online-status'
import { clearReturnTo, sanitizeReturnTo } from '@/shared/routes'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui'
import { PublicAuthShell } from '@/widgets/public-auth-shell'

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const { isOnline } = useOnlineStatus()
  const returnToValues = searchParams.getAll('returnTo')
  const returnTo =
    returnToValues.length === 1 ? sanitizeReturnTo(returnToValues[0]) : null

  useEffect(() => {
    clearReturnTo(sessionStorage)
  }, [])

  return (
    <PublicAuthShell
      eyebrow="Безопасный вход"
      title="Сначала — подтвердите себя в Telegram."
      description="Planner использует Telegram только для входа. После подтверждения вы вернётесь в свой закрытый контекст пары."
      footer={
        <p>
          Planner не показывает и не сохраняет в браузере идентификаторы вашей
          Telegram-сессии.
        </p>
      }
    >
      <div className="flex size-11 items-center justify-center bg-primary/10 text-primary">
        <ShieldCheck className="size-5" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">Войти в Planner</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Откроется отдельная страница Telegram. Planner не просит пароль и не
        читает ваши переписки.
      </p>

      {!isOnline ? (
        <Alert className="mt-5">
          <AlertTitle>Вы офлайн</AlertTitle>
          <AlertDescription>
            Подключитесь к интернету, чтобы начать вход. Мы не запустим его
            автоматически после восстановления связи.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6">
        <TelegramLoginLink returnTo={returnTo} />
      </div>
    </PublicAuthShell>
  )
}
