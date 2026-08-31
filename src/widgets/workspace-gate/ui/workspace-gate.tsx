import type { PropsWithChildren, ReactNode } from 'react'
import { RefreshCcw, UsersRound } from 'lucide-react'

import {
  useWorkspacePresentation,
  type WorkspacePresentation,
} from '@/entities/workspace'
import { ApiProblemError } from '@/shared/api'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Container,
  Spinner,
} from '@/shared/ui'

function GateSurface({ children }: PropsWithChildren) {
  return (
    <main className="relative flex min-h-svh items-center bg-background">
      <Container className="max-w-xl py-12">{children}</Container>
    </main>
  )
}

function getWorkspaceErrorMessage(error: unknown) {
  if (error instanceof ApiProblemError) {
    if (error.code === 'WORKSPACE_STATE_CONFLICT') {
      return 'Пространство пары сейчас обновляется. Повторите проверку.'
    }
    if (error.status === 403) {
      return 'Для этого аккаунта пространство пары недоступно.'
    }
    if (error.code === 'AUTHENTICATION_REQUIRED') {
      return 'Сессия завершена. Возвращаем на страницу входа.'
    }
  }
  return 'Не удалось получить контекст пары. Данные Planner не открыты.'
}

/** Resolves the backend-owned pair labels before protected children mount. */
export function WorkspaceGate({
  children,
}: {
  children: (workspace: WorkspacePresentation) => ReactNode
}) {
  const workspace = useWorkspacePresentation()

  if (workspace.isPending) {
    return (
      <GateSurface>
        <div className="flex items-center gap-3" role="status">
          <Spinner className="size-5" aria-hidden="true" />
          <div>
            <p className="font-medium">Открываем пространство пары</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Проверяем доступ и подписи участников.
            </p>
          </div>
        </div>
      </GateSurface>
    )
  }

  if (workspace.isError) {
    const canRetry =
      !(workspace.error instanceof ApiProblemError) ||
      workspace.error.status !== 403
    return (
      <GateSurface>
        <Alert variant="destructive">
          <UsersRound aria-hidden="true" />
          <AlertTitle>Пространство недоступно</AlertTitle>
          <AlertDescription>
            {getWorkspaceErrorMessage(workspace.error)}
          </AlertDescription>
        </Alert>
        {canRetry ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            isLoading={workspace.isFetching}
            loadingLabel="Повторная проверка"
            onClick={() => void workspace.refetch()}
          >
            <RefreshCcw aria-hidden="true" />
            Повторить
          </Button>
        ) : null}
      </GateSurface>
    )
  }

  return children(workspace.data)
}
