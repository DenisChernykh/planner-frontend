import {
  Bot,
  CircleCheck,
  ExternalLink,
  RefreshCcw,
  UsersRound,
} from 'lucide-react'

import { useTelegramNavigation } from '@/entities/telegram-navigation'
import { useWorkspacePresentation } from '@/entities/workspace'
import { LogoutButton } from '@/features/logout'
import { TelegramLoginLink } from '@/features/telegram-login'
import { ApiProblemError } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { settingsPath } from '@/shared/routes'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  Skeleton,
} from '@/shared/ui'

function TelegramNavigationCard() {
  const navigation = useTelegramNavigation()
  const canRetry =
    !(navigation.error instanceof ApiProblemError) ||
    navigation.error.status !== 403

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-4" aria-hidden="true" />
          Planner в Telegram
        </CardTitle>
        <CardDescription>
          Ссылка приходит только из безопасной backend-метаинформации.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {navigation.isPending ? <Skeleton className="h-8 w-full" /> : null}
        {navigation.isError ? (
          <div>
            <p className="text-sm text-muted-foreground">
              Не удалось проверить доступность бота.
            </p>
            {canRetry ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                isLoading={navigation.isFetching}
                loadingLabel="Проверяем бота"
                onClick={() => void navigation.refetch()}
              >
                <RefreshCcw aria-hidden="true" />
                Повторить
              </Button>
            ) : null}
          </div>
        ) : null}
        {!navigation.isError && navigation.data?.status === 'available' ? (
          <a
            href={navigation.data.url}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Открыть Planner-бота
            <ExternalLink aria-hidden="true" />
          </a>
        ) : null}
        {!navigation.isError &&
        navigation.data !== undefined &&
        navigation.data.status !== 'available' ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Переход в бота сейчас отключён администратором пространства.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const workspace = useWorkspacePresentation()

  if (workspace.data === undefined) return null

  return (
    <Container as="section" className="py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Badge variant="secondary">Аккаунт</Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Настройки доступа
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Здесь доступны управление сессией, контекст пары и безопасный переход
          в Telegram.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="size-4" aria-hidden="true" />
                Пространство пары
              </CardTitle>
              <CardDescription>
                Подписи получены из текущего workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Вы</dt>
                <dd className="font-medium">
                  {workspace.data.currentMember.displayName}
                </dd>
                <dt className="text-muted-foreground">Партнёр</dt>
                <dd className="font-medium">
                  {workspace.data.partnerMember.displayName}
                </dd>
                <dt className="text-muted-foreground">Часовой пояс</dt>
                <dd className="font-medium">{workspace.data.timeZone}</dd>
              </dl>
            </CardContent>
          </Card>

          <TelegramNavigationCard />
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheck className="size-4" aria-hidden="true" />
              Сессия активна
            </CardTitle>
            <CardDescription>
              Можно подтвердить Telegram заново или завершить текущую сессию.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <TelegramLoginLink
              label="Войти заново через Telegram"
              returnTo={settingsPath}
              variant="outline"
            />
            <LogoutButton />
          </CardContent>
        </Card>

        <Alert className="mt-4">
          <AlertTitle>Технические идентификаторы скрыты</AlertTitle>
          <AlertDescription>
            На экране нет идентификаторов сессии, пользователя, пространства или
            Telegram.
          </AlertDescription>
        </Alert>
      </div>
    </Container>
  )
}
