import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { findOpenApiDrift } from './check-openapi.mjs'

describe('OpenAPI generated drift detection', () => {
  it('sees rogue untracked generated output before a clean generator can remove it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'planner-openapi-drift-test-'))

    try {
      execFileSync('git', ['init', '--quiet'], { cwd: root })
      const generatedDirectory = join(root, 'src/shared/api/generated')
      await mkdir(generatedDirectory, { recursive: true })
      await writeFile(
        join(generatedDirectory, 'rogue.ts'),
        'export const rogue = true\n',
      )

      expect(findOpenApiDrift(root)).toEqual({
        staged: [],
        unstaged: [],
        untracked: ['src/shared/api/generated/rogue.ts'],
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
