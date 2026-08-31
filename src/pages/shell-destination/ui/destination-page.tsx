import type { ReactNode } from 'react'
import { Construction, Sparkles } from 'lucide-react'

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
} from '@/shared/ui'

type DestinationPageProps = Readonly<{
  badge: string
  description: string
  title: string
  trailing?: ReactNode
}>

export function DestinationPage({
  badge,
  description,
  title,
  trailing,
}: DestinationPageProps) {
  return (
    <Container as="section" className="py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {badge}
        </Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>

        <Card className="mt-8 border-dashed bg-card/60">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center bg-secondary text-secondary-foreground">
              <Construction className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>Каркас маршрута готов</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Навигация, доступ и общий контекст уже готовы. Данные и действия
              появятся вместе с основным сценарием раздела.
            </p>
            {trailing}
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}
