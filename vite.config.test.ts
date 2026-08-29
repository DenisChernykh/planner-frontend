// @vitest-environment node

import { describe, expect, it } from 'vitest'

import viteConfig, {
  parseDevApiProxyTarget,
  rewriteApiProxyPath,
} from './vite.config.ts'

async function resolveDevProxyContexts(): Promise<readonly string[]> {
  const config =
    typeof viteConfig === 'function'
      ? await viteConfig({
          command: 'serve',
          isPreview: false,
          isSsrBuild: false,
          mode: 'test',
        })
      : viteConfig

  return Object.keys(config.server?.proxy ?? {})
}

function matchesProxyContext(
  contexts: readonly string[],
  requestPath: string,
): boolean {
  return contexts.some((context) =>
    context.startsWith('^')
      ? new RegExp(context, 'u').test(requestPath)
      : requestPath.startsWith(context),
  )
}

describe('parseDevApiProxyTarget', () => {
  it('defaults to the local Planner backend origin', () => {
    expect(parseDevApiProxyTarget(undefined)).toBe('http://localhost:3000')
  })

  it('normalizes an explicit HTTP(S) origin', () => {
    expect(parseDevApiProxyTarget('https://api.example.com/')).toBe(
      'https://api.example.com',
    )
  })

  it.each([
    '/api',
    'ftp://api.example.com',
    'https://user:secret@api.example.com',
    'https://api.example.com/api',
    'https://api.example.com?token=secret',
  ])('rejects an unsafe proxy target: %s', (value) => {
    expect(() => parseDevApiProxyTarget(value)).toThrow('DEV_API_PROXY_TARGET')
  })
})

describe('Planner development proxy route table', () => {
  it.each([
    '/api',
    '/api/tracking/today',
    '/auth/telegram/start',
    '/auth/telegram/start?returnTo=%2Ftoday',
    '/auth/telegram/callback',
    '/auth/telegram/callback?code=opaque',
  ])('proxies the backend-owned route: %s', async (requestPath) => {
    expect(
      matchesProxyContext(await resolveDevProxyContexts(), requestPath),
    ).toBe(true)
  })

  it.each([
    '/apiary',
    '/auth',
    '/auth/telegram',
    '/auth/telegram/result',
    '/auth/telegram/start/extra',
    '/auth/telegram/callback-extra',
  ])('keeps the frontend-owned route in the SPA: %s', async (requestPath) => {
    expect(
      matchesProxyContext(await resolveDevProxyContexts(), requestPath),
    ).toBe(false)
  })

  it.each([
    ['/api', '/'],
    ['/api/tracking/today', '/tracking/today'],
    ['/api/api/tracking/today', '/api/tracking/today'],
    ['/api?fresh=true', '?fresh=true'],
    ['/apiary', '/apiary'],
  ])('rewrites only the first /api prefix: %s -> %s', (input, expected) => {
    expect(rewriteApiProxyPath(input)).toBe(expected)
  })
})
