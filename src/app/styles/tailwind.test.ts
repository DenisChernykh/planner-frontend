import { describe, expect, it } from 'vitest'

import compiledCss from './index.css?inline'

const semanticUtilities = [
  '.border-border',
  '.bg-background',
  '.text-primary',
  '.bg-status-success',
  '.text-status-success-foreground',
  '.bg-status-danger',
  '.text-status-danger-foreground',
  '.bg-status-warning',
  '.text-status-warning-foreground',
  '.bg-status-info',
  '.text-status-info-foreground',
  '.bg-status-muted',
  '.text-status-muted-foreground',
  '.bg-scope-personal',
  '.text-scope-personal-foreground',
  '.bg-scope-shared',
  '.text-scope-shared-foreground',
  '.bg-scope-partner',
  '.text-scope-partner-foreground',
]

describe('Tailwind Vite integration', () => {
  it('compiles utilities and leaves no Tailwind directives in browser CSS', () => {
    expect(compiledCss).toContain('.min-h-screen')
    expect(compiledCss).not.toMatch(/@(tailwind|theme)\b/)
  })

  it('compiles shadcn and Planner semantic color utilities for consumers', () => {
    for (const utility of semanticUtilities) {
      expect(compiledCss).toContain(utility)
    }
  })

  it('does not retain legacy hard-coded page colors', () => {
    expect(compiledCss).not.toContain('#18181b')
    expect(compiledCss).not.toContain('#fafafa')
  })
})
