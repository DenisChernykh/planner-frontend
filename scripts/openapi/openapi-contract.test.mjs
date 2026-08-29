import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  publishedArtifactUrl,
  sha256,
  syncOpenApi,
} from './openapi-contract.mjs'

const revision = 'cf76080b2a1972377eb1e4fa4da5ccd8aaa02331'

async function createContractRoot() {
  const root = await mkdtemp(join(tmpdir(), 'planner-openapi-test-'))
  const openApiDirectory = join(root, 'openapi')
  await mkdir(openApiDirectory)

  const artifact = Buffer.from(
    JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'Test', version: '1' },
      paths: {
        '/health/live': {
          get: {
            operationId: 'HealthController_live',
            responses: { 200: { description: 'ok' } },
          },
        },
      },
    }),
  )
  const manifest = {
    schemaVersion: 'planner.openapi-source.v1',
    repository: 'https://github.com/DenisChernykh/planner',
    revision,
    artifactPath: 'docs/api/openapi.json',
    sha256: sha256(artifact),
  }
  const requiredOperations = {
    schemaVersion: 'planner.openapi-required-operations.v1',
    operations: [
      {
        method: 'GET',
        path: '/health/live',
        operationId: 'HealthController_live',
      },
    ],
  }

  await Promise.all([
    writeFile(
      join(openApiDirectory, 'source.json'),
      `${JSON.stringify(manifest)}\n`,
    ),
    writeFile(
      join(openApiDirectory, 'required-operations.json'),
      `${JSON.stringify(requiredOperations)}\n`,
    ),
  ])

  return { artifact, root }
}

describe('OpenAPI published source', () => {
  it('builds the canonical URL from the actual backend remote', () => {
    expect(
      publishedArtifactUrl({
        repository: 'https://github.com/DenisChernykh/planner',
        revision,
        artifactPath: 'docs/api/openapi.json',
      }),
    ).toBe(
      `https://raw.githubusercontent.com/DenisChernykh/planner/${revision}/docs/api/openapi.json`,
    )
  })

  it('authenticates only the default private GitHub source', async () => {
    const { artifact, root } = await createContractRoot()
    const fetchImplementation = vi.fn(async () =>
      Promise.resolve(new Response(artifact, { status: 200 })),
    )

    try {
      await syncOpenApi({
        root,
        fetchImplementation,
        githubTokenResolver: async () => 'test-private-token',
      })

      expect(fetchImplementation).toHaveBeenCalledWith(
        `https://raw.githubusercontent.com/DenisChernykh/planner/${revision}/docs/api/openapi.json`,
        { headers: { Authorization: 'Bearer test-private-token' } },
      )
      expect(await readFile(join(root, 'openapi/openapi.json'))).toEqual(
        artifact,
      )

      fetchImplementation.mockClear()
      const tokenResolver = vi.fn(async () => 'must-not-be-used')
      await syncOpenApi({
        root,
        source: 'https://contracts.example.test/planner.json',
        fetchImplementation,
        githubTokenResolver: tokenResolver,
      })

      expect(tokenResolver).not.toHaveBeenCalled()
      expect(fetchImplementation).toHaveBeenCalledWith(
        'https://contracts.example.test/planner.json',
        undefined,
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
