import { useRevalidator, useRouteError } from 'react-router'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Container,
} from '@/shared/ui'

import { getRouteErrorPresentation } from './route-error-presentation'

/** Safe application-level boundary for route loaders and rendering failures. */
export function RouteError() {
  const error = useRouteError()
  const revalidator = useRevalidator()
  const presentation = getRouteErrorPresentation(error)

  return (
    <Container as="main" className="flex min-h-screen items-center py-10">
      <section className="mx-auto w-full max-w-lg">
        <Alert variant="destructive">
          <AlertTitle>Не удалось открыть страницу</AlertTitle>
          <AlertDescription>
            <p>{presentation.message}</p>
            {presentation.requestId === undefined ? null : (
              <p className="mt-2 text-xs">
                Код запроса: {presentation.requestId}
              </p>
            )}
          </AlertDescription>
        </Alert>

        {presentation.retryable ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => revalidator.revalidate()}
          >
            Повторить
          </Button>
        ) : null}
      </section>
    </Container>
  )
}
