import { Link } from 'react-router'

import { rootPath } from '@/shared/routes'
import { Button, Container } from '@/shared/ui'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center">
      <Container className="max-w-xl py-12 text-center">
        <p className="text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Такой страницы пока нет
        </h1>
        <p className="mt-4 text-muted-foreground">
          Вернитесь к началу Planner. Ссылка могла устареть или содержать
          ошибку.
        </p>
        <Button render={<Link to={rootPath} />} className="mt-7">
          На главную
        </Button>
      </Container>
    </main>
  )
}
