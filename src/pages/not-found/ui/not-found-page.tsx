import { Link } from 'react-router'

import { cn } from '@/shared/lib/utils'
import { rootPath } from '@/shared/routes'
import { buttonVariants, Container } from '@/shared/ui'

export function NotFoundPage() {
  return (
    <section className="flex flex-1 items-center">
      <Container className="max-w-xl py-12 text-center">
        <p className="text-sm font-semibold text-muted-foreground">404</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          Такой страницы пока нет
        </h2>
        <p className="mt-4 text-muted-foreground">
          Вернитесь к началу Planner. Ссылка могла устареть или содержать
          ошибку.
        </p>
        <Link to={rootPath} className={cn(buttonVariants(), 'mt-7')}>
          На главную
        </Link>
      </Container>
    </section>
  )
}
