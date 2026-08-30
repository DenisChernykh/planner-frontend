import { useEffect, useRef, type ComponentType } from 'react'
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  ChevronUp,
  CircleUserRound,
  CloudOff,
  ListChecks,
  LogOut,
  RefreshCcw,
  Settings,
  Sparkles,
} from 'lucide-react'
import { Link, matchPath, Outlet, useLocation } from 'react-router'

import { useLogout } from '@/features/logout'
import {
  selectTrackingNavigation,
  useTrackingToday,
  type TrackingNavigation,
} from '@/entities/tracking'
import type { WorkspacePresentation } from '@/entities/workspace'
import { ApiProblemError } from '@/shared/api'
import { useOnlineStatus } from '@/shared/lib/online-status'
import {
  monthPath,
  plansPath,
  settingsPath,
  statisticsPath,
  todayPath,
} from '@/shared/routes'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Container,
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSeparator,
  MenuTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  Skeleton,
  useSidebar,
} from '@/shared/ui'

type AppShellProps = Readonly<{
  workspace: WorkspacePresentation
}>

type NavigationItem = Readonly<{
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  to: string | null
  activePattern: string
}>

function formatTargetMonth(targetMonth: string) {
  const [year, month] = targetMonth.split('-').map(Number)
  if (year === undefined || month === undefined) return targetMonth

  const label = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)))

  return label.charAt(0).toUpperCase() + label.slice(1)
}

function getLifecycleLabel(navigation: TrackingNavigation | null) {
  if (navigation === null) return 'Проверяем контекст месяца'
  if (navigation.state === 'no_plan') return 'План ещё не создан'
  if (navigation.state === 'draft') return 'Черновик месяца'
  if (navigation.phase === 'future') return 'Будущий план'
  if (navigation.phase === 'active') {
    return navigation.lifecycleMode === 'reopened'
      ? 'Месяц открыт повторно'
      : 'Активный месяц'
  }
  if (navigation.phase === 'grace') return 'Период завершения'
  return 'Месяц закрыт'
}

function getPageTitle(pathname: string) {
  if (pathname === todayPath) return 'Сегодня'
  if (matchPath('/months/:targetMonth/*', pathname)) return 'Месяц'
  if (matchPath('/plans/*', pathname)) return 'Планы'
  if (matchPath('/statistics/:targetMonth/*', pathname)) return 'Статистика'
  if (pathname === settingsPath) return 'Настройки'
  return 'Planner'
}

function useCloseMobileSidebar() {
  const { isMobile, setOpenMobile } = useSidebar()
  return () => {
    if (isMobile) setOpenMobile(false)
  }
}

function PrimaryNavigation({
  navigation,
}: {
  navigation: TrackingNavigation | null
}) {
  const location = useLocation()
  const closeMobileSidebar = useCloseMobileSidebar()
  const targetMonth = navigation?.targetMonth ?? null
  const items: NavigationItem[] = [
    {
      label: 'Сегодня',
      icon: ListChecks,
      to: todayPath,
      activePattern: '/today',
    },
    {
      label: 'Месяц',
      icon: CalendarDays,
      to: targetMonth === null ? null : monthPath(targetMonth),
      activePattern: '/months/:targetMonth/*',
    },
    {
      label: 'Планы',
      icon: CalendarRange,
      to: plansPath,
      activePattern: '/plans/*',
    },
    {
      label: 'Статистика',
      icon: BarChart3,
      to: targetMonth === null ? null : statisticsPath(targetMonth),
      activePattern: '/statistics/:targetMonth/*',
    },
  ]

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Навигация</SidebarGroupLabel>
      <SidebarGroupContent>
        <nav aria-label="Основная навигация">
          <SidebarMenu>
            {items.map(({ label, icon: Icon, to, activePattern }) => {
              const isActive =
                matchPath(activePattern, location.pathname) !== null
              return (
                <SidebarMenuItem key={label}>
                  {to === null ? (
                    <SidebarMenuButton
                      type="button"
                      disabled
                      tooltip={`${label}: контекст месяца загружается`}
                    >
                      <Icon aria-hidden={true} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      render={
                        <Link
                          to={to}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={closeMobileSidebar}
                        />
                      }
                      isActive={isActive}
                      tooltip={label}
                    >
                      <Icon aria-hidden={true} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </nav>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function AccountMenu({ workspace }: AppShellProps) {
  const logout = useLogout()
  const closeMobileSidebar = useCloseMobileSidebar()

  return (
    <Menu>
      <MenuTrigger
        aria-label={`Аккаунт: ${workspace.currentMember.displayName} и ${workspace.partnerMember.displayName}`}
        className="flex min-h-11 w-full items-center gap-2 border border-sidebar-border bg-sidebar px-2 text-left text-xs outline-none group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring data-popup-open:bg-sidebar-accent"
      >
        <span className="flex size-7 shrink-0 items-center justify-center bg-primary/10 text-primary">
          <CircleUserRound className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate font-medium">
            {workspace.currentMember.displayName}
          </span>
          <span className="block truncate text-muted-foreground">
            с {workspace.partnerMember.displayName}
          </span>
        </span>
        <ChevronUp
          className="size-4 group-data-[collapsible=icon]:hidden"
          aria-hidden="true"
        />
      </MenuTrigger>
      <MenuPortal>
        <MenuPositioner side="top" align="start" className="w-60">
          <MenuPopup className="w-60">
            <MenuGroup>
              <MenuGroupLabel>Пространство пары</MenuGroupLabel>
              <div className="px-2 pb-2 text-xs leading-5">
                <p className="font-medium">
                  {workspace.currentMember.displayName} и{' '}
                  {workspace.partnerMember.displayName}
                </p>
                <p className="text-muted-foreground">{workspace.timeZone}</p>
              </div>
            </MenuGroup>
            <MenuSeparator />
            <MenuLinkItem
              closeOnClick
              render={<Link to={settingsPath} onClick={closeMobileSidebar} />}
            >
              <Settings aria-hidden="true" />
              Настройки
            </MenuLinkItem>
            <MenuItem
              closeOnClick={false}
              disabled={
                !logout.isOnline || logout.isBlocked || logout.isPending
              }
              onClick={logout.logout}
              className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
            >
              <LogOut aria-hidden="true" />
              {logout.isBlocked
                ? 'Выход недоступен'
                : logout.isPending
                  ? 'Завершаем сессию…'
                  : logout.isOnline
                    ? 'Выйти'
                    : 'Выход недоступен офлайн'}
            </MenuItem>
            {logout.errorMessage === null ? null : (
              <p
                className="px-2 py-1.5 text-xs leading-5 text-destructive"
                role="alert"
              >
                {logout.errorMessage}
              </p>
            )}
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </Menu>
  )
}

function TrackingState({
  isPending,
  isError,
  isFetching,
  error,
  onRetry,
}: Readonly<{
  isPending: boolean
  isError: boolean
  isFetching: boolean
  error: unknown
  onRetry: () => void
}>) {
  if (isPending) {
    return (
      <Container className="py-8" aria-busy="true" aria-label="Загрузка месяца">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </Container>
    )
  }

  if (!isError) return <Outlet />

  const canRetry = !(error instanceof ApiProblemError) || error.status !== 403

  return (
    <Container className="max-w-2xl py-10">
      <Alert variant="destructive">
        <AlertTitle>Контекст месяца недоступен</AlertTitle>
        <AlertDescription>
          Planner не открывает экраны без актуального состояния месяца.
        </AlertDescription>
      </Alert>
      {canRetry ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          isLoading={isFetching}
          loadingLabel="Повторная проверка"
          onClick={onRetry}
        >
          <RefreshCcw aria-hidden="true" />
          Повторить
        </Button>
      ) : null}
    </Container>
  )
}

export function AppShell({ workspace }: AppShellProps) {
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)
  const pageTitleRef = useRef<HTMLHeadingElement>(null)
  const previousPathname = useRef<string | null>(null)
  const { isOnline } = useOnlineStatus()
  const tracking = useTrackingToday()
  const navigation = tracking.data
    ? selectTrackingNavigation(tracking.data)
    : null

  useEffect(() => {
    if (previousPathname.current === null) {
      previousPathname.current = location.pathname
      pageTitleRef.current?.focus()
      return
    }
    if (previousPathname.current === location.pathname) return
    previousPathname.current = location.pathname
    const focusTitle = window.setTimeout(() => pageTitleRef.current?.focus(), 0)
    return () => window.clearTimeout(focusTitle)
  }, [location.pathname])

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <Link
            to="/"
            aria-label="Planner — на главную"
            className="flex h-10 items-center gap-2 px-2 outline-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span className="font-semibold group-data-[collapsible=icon]:hidden">
              Planner
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <PrimaryNavigation navigation={navigation} />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <AccountMenu workspace={workspace} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {!isOnline ? (
          <div
            className="flex items-center justify-center gap-2 border-b border-status-warning-foreground/20 bg-status-warning px-4 py-2 text-xs font-medium text-status-warning-foreground"
            role="status"
          >
            <CloudOff className="size-4" aria-hidden="true" />
            Вы офлайн. Доступен только уже загруженный просмотр; действия
            отключены.
          </div>
        ) : null}

        <header className="sticky top-0 z-10 flex min-h-14 items-center gap-3 border-b border-border bg-background/92 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger />
          <div className="min-w-0 flex-1">
            <h1
              ref={pageTitleRef}
              tabIndex={-1}
              className="truncate text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {pageTitle}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {navigation === null
                ? getLifecycleLabel(null)
                : `${formatTargetMonth(navigation.targetMonth)} · ${getLifecycleLabel(navigation)}`}
            </p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {workspace.currentMember.displayName}
          </Badge>
        </header>

        <TrackingState
          isPending={tracking.isPending}
          isError={tracking.isError}
          isFetching={tracking.isFetching}
          error={tracking.error}
          onRetry={() => void tracking.refetch()}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
