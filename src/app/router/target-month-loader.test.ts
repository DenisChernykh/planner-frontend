import { describe, expect, it } from 'vitest'

import { requireCanonicalTargetMonth } from './target-month-loader'

function run(targetMonth: string | undefined) {
  return requireCanonicalTargetMonth({
    context: {} as never,
    params: targetMonth === undefined ? {} : { targetMonth },
    request: new Request(`http://planner.test/months/${targetMonth ?? ''}`),
  } as never)
}

describe('canonical targetMonth route loader', () => {
  it('accepts the canonical backend month value', () => {
    expect(run('2026-08')).toBeNull()
  })

  it.each([undefined, '0000-01', '2026-8', '2026-13', 'not-a-month'])(
    'returns a local 404 for %s',
    (targetMonth) => {
      let response: unknown
      try {
        run(targetMonth)
      } catch (error) {
        response = error
      }

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(404)
    },
  )
})
