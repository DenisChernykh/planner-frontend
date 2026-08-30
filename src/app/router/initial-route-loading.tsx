import { Container, Spinner } from '@/shared/ui'

/** Accessible, privacy-neutral surface shown while an initial route loader runs. */
export function InitialRouteLoading() {
  return (
    <main
      className="flex min-h-svh items-center bg-background"
      aria-busy="true"
    >
      <Container className="max-w-xl py-12">
        <div
          className="flex items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <Spinner className="size-5" aria-hidden="true" />
          <div>
            <p className="font-medium">Открываем Planner</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Проверяем доступ к выбранному экрану.
            </p>
          </div>
        </div>
      </Container>
    </main>
  )
}
