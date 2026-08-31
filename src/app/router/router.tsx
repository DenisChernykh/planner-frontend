import type { QueryClient } from '@tanstack/react-query'
import { createBrowserRouter, type RouteObject } from 'react-router'

import { queryClient } from '@/app/config/query-client'
import { clearCurrentSession, loadCurrentSession } from '@/entities/session'
import { loadTrackingToday } from '@/entities/tracking'
import {
  currentWorkspaceQueryKey,
  loadCurrentWorkspace,
} from '@/entities/workspace'
import { HomeResolverPage } from '@/pages/home-resolver'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'
import { SettingsPage } from '@/pages/settings'
import {
  MonthPage,
  PlansPage,
  StatisticsPage,
  TodayPage,
} from '@/pages/shell-destination'
import { TelegramResultPage } from '@/pages/telegram-result'
import {
  beginProtectedSessionExit,
  markFreshProtectedSessionDecision,
} from '@/shared/lib/protected-session'
import {
  clearReturnTo,
  loginPath,
  rootPath,
  telegramResultPath,
  todayPath,
} from '@/shared/routes'

import { ProtectedLayout } from './protected-layout'
import { InitialRouteLoading } from './initial-route-loading'
import { RouteError } from './route-error'
import {
  createRedirectAuthenticatedLoader,
  createRequireSessionLoader,
} from './session-loaders'
import { requireCanonicalTargetMonth } from './target-month-loader'

export function createAppRoutes(appQueryClient: QueryClient): RouteObject[] {
  const clear = () => {
    if (typeof sessionStorage !== 'undefined') clearReturnTo(sessionStorage)
    clearCurrentSession(appQueryClient)
  }
  const load = (signal: AbortSignal) =>
    loadCurrentSession(appQueryClient, signal, {
      onPrincipalChange: beginProtectedSessionExit,
    })
  const publicSessionLoader = createRedirectAuthenticatedLoader({
    beginExit: beginProtectedSessionExit,
    clear,
    load,
  })
  const protectedSessionLoader = createRequireSessionLoader({
    beginExit: beginProtectedSessionExit,
    clear,
    confirmAccess: markFreshProtectedSessionDecision,
    load: async (signal, request) => {
      const session = await load(signal)
      const pathname = new URL(request.url).pathname
      if (pathname === rootPath) {
        await loadCurrentWorkspace(appQueryClient, signal)
        await loadTrackingToday(appQueryClient, signal)
      } else if (
        pathname === todayPath &&
        appQueryClient.getQueryData(currentWorkspaceQueryKey) !== undefined
      ) {
        // Direct /today loads let WorkspaceGate establish access first. On
        // an in-app navigation the workspace is already confirmed, so the
        // route can refresh Today before its content is rendered.
        await loadTrackingToday(appQueryClient, signal)
      }
      return session
    },
  })

  return [
    {
      path: loginPath,
      loader: publicSessionLoader,
      element: <LoginPage />,
      errorElement: <RouteError />,
      hydrateFallbackElement: <InitialRouteLoading />,
    },
    {
      path: telegramResultPath,
      loader: publicSessionLoader,
      element: <TelegramResultPage />,
      errorElement: <RouteError />,
      hydrateFallbackElement: <InitialRouteLoading />,
    },
    {
      path: rootPath,
      loader: protectedSessionLoader,
      shouldRevalidate: ({ currentUrl, defaultShouldRevalidate, nextUrl }) => {
        // HomeResolver has already loaded Today as part of the root's
        // session → workspace → tracking sequence. Avoid a duplicate read
        // when that resolver replaces / with /today.
        if (
          currentUrl.pathname === rootPath &&
          nextUrl.pathname === todayPath
        ) {
          return false
        }
        return (
          nextUrl.pathname === rootPath ||
          nextUrl.pathname === todayPath ||
          defaultShouldRevalidate
        )
      },
      element: <ProtectedLayout />,
      errorElement: <RouteError />,
      hydrateFallbackElement: <InitialRouteLoading />,
      children: [
        { index: true, element: <HomeResolverPage /> },
        { path: 'today', element: <TodayPage /> },
        {
          path: 'months/:targetMonth',
          loader: requireCanonicalTargetMonth,
          element: <MonthPage />,
          errorElement: <NotFoundPage />,
        },
        { path: 'plans', element: <PlansPage /> },
        {
          path: 'statistics/:targetMonth',
          loader: requireCanonicalTargetMonth,
          element: <StatisticsPage />,
          errorElement: <NotFoundPage />,
        },
        { path: 'settings', element: <SettingsPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]
}

export const routes = createAppRoutes(queryClient)
export const router = createBrowserRouter(routes)
