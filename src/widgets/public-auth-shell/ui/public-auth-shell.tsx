import {
  useEffect,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from 'react'
import { LockKeyhole, Sparkles } from 'lucide-react'

import { Badge, Card, CardContent, Container } from '@/shared/ui'

type PublicAuthShellProps = PropsWithChildren<{
  eyebrow: string
  title: string
  description: string
  footer?: ReactNode
}>

/** Public, privacy-safe shell for login and finite OIDC result states. */
export function PublicAuthShell({
  eyebrow,
  title,
  description,
  footer,
  children,
}: PublicAuthShellProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,var(--color-scope-shared),transparent_35%),radial-gradient(circle_at_90%_82%,var(--color-primary),transparent_28%)] opacity-15"
        aria-hidden="true"
      />
      <Container className="grid min-h-svh items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_28rem] lg:py-16">
        <section className="max-w-2xl">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Planner для двоих
          </Badge>
          <p className="text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="mt-3 text-4xl font-semibold tracking-tight text-balance outline-none sm:text-6xl"
          >
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
            {description}
          </p>
        </section>

        <Card className="border-border/80 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8">
            {children}
            {footer === undefined ? null : (
              <div className="mt-7 flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
                <LockKeyhole
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <div>{footer}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </Container>
    </main>
  )
}
