import {
  CalendarDays,
  ChartNoAxesCombined,
  ListChecks,
  Sparkles,
} from 'lucide-react'

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
} from '@/shared/ui'

const surfaces = [
  {
    title: 'Сегодня',
    description: 'Ежедневные действия и общий ритм пары.',
    icon: ListChecks,
  },
  {
    title: 'Планы',
    description: 'Месячные цели, публикации и календарь.',
    icon: CalendarDays,
  },
  {
    title: 'Статистика',
    description: 'Точные итоги без локального пересчёта правил.',
    icon: ChartNoAxesCombined,
  },
] as const

/** Нейтральный экран runnable foundation до реализации продуктового AppShell. */
export function FoundationPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top_left,var(--color-scope-shared),transparent_46%)] opacity-20"
        aria-hidden="true"
      />
      <Container className="relative py-10 sm:py-16 lg:py-24">
        <section className="mx-auto max-w-5xl">
          <Badge variant="secondary" className="mb-5 gap-1.5">
            <Sparkles className="size-3.5" aria-hidden="true" />
            M1 · frontend foundation
          </Badge>
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Planner
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Место, где общий месяц становится понятным.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
              Инженерная основа приложения подключена. Следующий слой добавит
              Telegram-вход, контекст пары и реальные данные Planner API.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {surfaces.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Container>
    </main>
  )
}
