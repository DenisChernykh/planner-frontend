import { createBrowserRouter, type RouteObject } from 'react-router'

import { FoundationPage } from '@/pages/foundation'
import { NotFoundPage } from '@/pages/not-found'

import { RouteError } from './route-error'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <FoundationPage />,
    errorElement: <RouteError />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
    errorElement: <RouteError />,
  },
]

export const router = createBrowserRouter(routes)
