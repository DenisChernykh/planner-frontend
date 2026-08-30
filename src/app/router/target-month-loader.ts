import type { LoaderFunction } from 'react-router'

import { productMonthSchema } from '@/shared/lib/date'

/** Rejects a non-canonical month locally before a destination can use it. */
export const requireCanonicalTargetMonth: LoaderFunction = ({ params }) => {
  if (!productMonthSchema.safeParse(params.targetMonth).success) {
    throw new Response(null, { status: 404, statusText: 'Not Found' })
  }

  return null
}
