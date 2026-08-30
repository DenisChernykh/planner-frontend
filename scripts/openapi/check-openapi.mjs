import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  OPENAPI_SNAPSHOT_PATH,
  OPENAPI_SOURCE_PATH,
  REQUIRED_OPERATIONS_PATH,
  validateCommittedSnapshot,
} from './openapi-contract.mjs'

export const OPENAPI_DRIFT_PATHS = [
  OPENAPI_SOURCE_PATH,
  REQUIRED_OPERATIONS_PATH,
  OPENAPI_SNAPSHOT_PATH,
  'src/shared/api/generated',
  'src/shared/api/generated-zod',
]

function gitLines(root, arguments_) {
  return execFileSync('git', arguments_, {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function findOpenApiDrift(root = process.cwd()) {
  const unstaged = gitLines(root, [
    'diff',
    '--name-only',
    '--',
    ...OPENAPI_DRIFT_PATHS,
  ])
  const staged = gitLines(root, [
    'diff',
    '--cached',
    '--name-only',
    '--',
    ...OPENAPI_DRIFT_PATHS,
  ])
  const untracked = gitLines(root, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '--',
    ...OPENAPI_DRIFT_PATHS,
  ])

  return { staged, unstaged, untracked }
}

export async function checkOpenApi(root = process.cwd()) {
  await validateCommittedSnapshot(root)
  const drift = findOpenApiDrift(root)
  const messages = []

  for (const [kind, paths] of Object.entries(drift)) {
    if (paths.length > 0) messages.push(`${kind}: ${paths.join(', ')}`)
  }
  if (messages.length > 0) {
    throw new Error(`OpenAPI generated drift detected (${messages.join('; ')})`)
  }

  return drift
}

async function main() {
  await checkOpenApi()
  process.stdout.write('OpenAPI snapshot and generated outputs are clean\n')
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main()
}
