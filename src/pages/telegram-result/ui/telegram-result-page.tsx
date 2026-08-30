import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  RotateCcw,
} from 'lucide-react'

import {
  TelegramOidcResultCodeSchema,
  type TelegramOidcResultCode,
} from '@/shared/api'
import { TelegramLoginLink } from '@/features/telegram-login'
import { clearReturnTo } from '@/shared/routes'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui'
import { PublicAuthShell } from '@/widgets/public-auth-shell'

type ResultPresentation = Readonly<{
  title: string
  description: string
  tone: 'default' | 'destructive'
  icon: typeof CircleCheck
  canRetry: boolean
}>

const presentations: Record<TelegramOidcResultCode, ResultPresentation> = {
  success: {
    title: 'Сессию не удалось подтвердить',
    description:
      'Telegram завершил вход, но Planner не получил активную сессию. Начните новый вход.',
    tone: 'destructive',
    icon: CircleAlert,
    canRetry: true,
  },
  cancelled: {
    title: 'Вход отменён',
    description:
      'Ничего не изменилось. Вы можете вернуться и попробовать снова.',
    tone: 'default',
    icon: CircleX,
    canRetry: true,
  },
  login_rejected: {
    title: 'Telegram не подтвердил вход',
    description: 'Начните новый вход и проверьте выбранный аккаунт.',
    tone: 'destructive',
    icon: Ban,
    canRetry: true,
  },
  access_denied: {
    title: 'Доступ к Planner не разрешён',
    description:
      'Для этого аккаунта вход закрыт. Обратитесь к тому, кто подключал пространство пары.',
    tone: 'destructive',
    icon: Ban,
    canRetry: true,
  },
  dependency_unavailable: {
    title: 'Сервис входа временно недоступен',
    description: 'Подождите немного и начните новый вход вручную.',
    tone: 'default',
    icon: Clock3,
    canRetry: true,
  },
  invalid_callback: {
    title: 'Не удалось проверить ответ Telegram',
    description: 'Старая попытка больше не действует. Начните новый вход.',
    tone: 'destructive',
    icon: RotateCcw,
    canRetry: true,
  },
}

const unknownPresentation: ResultPresentation = {
  title: 'Результат входа не распознан',
  description: 'Начните новый вход. Технические параметры ответа скрыты.',
  tone: 'destructive',
  icon: CircleAlert,
  canRetry: true,
}

function readResult(values: string[]) {
  if (values.length !== 1) return null
  const parsed = TelegramOidcResultCodeSchema.safeParse(values[0])
  return parsed.success ? parsed.data : null
}

export function TelegramResultPage() {
  const [searchParams] = useSearchParams()
  const result = readResult(searchParams.getAll('result'))
  const presentation =
    result === null ? unknownPresentation : presentations[result]
  const Icon = presentation.icon

  useEffect(() => {
    clearReturnTo(sessionStorage)
  }, [])

  return (
    <PublicAuthShell
      eyebrow="Telegram OIDC"
      title="Возвращение в Planner"
      description="Planner показывает только конечный результат входа и никогда не выводит технические параметры Telegram."
      footer={<p>Каждая повторная попытка создаёт новую процедуру входа.</p>}
    >
      <div className="flex size-11 items-center justify-center bg-secondary text-secondary-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <Alert
        variant={presentation.tone}
        className="mt-5"
        data-result={result ?? 'unknown'}
      >
        <AlertTitle>{presentation.title}</AlertTitle>
        <AlertDescription>{presentation.description}</AlertDescription>
      </Alert>

      {presentation.canRetry ? (
        <div className="mt-6">
          <TelegramLoginLink label="Начать новый вход" returnTo={null} />
        </div>
      ) : null}
    </PublicAuthShell>
  )
}
