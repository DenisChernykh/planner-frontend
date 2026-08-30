import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

export const OPENAPI_SOURCE_PATH = 'openapi/source.json'
export const REQUIRED_OPERATIONS_PATH = 'openapi/required-operations.json'
export const OPENAPI_SNAPSHOT_PATH = 'openapi/openapi.json'

const SOURCE_SCHEMA_VERSION = 'planner.openapi-source.v1'
const REQUIRED_OPERATIONS_SCHEMA_VERSION =
  'planner.openapi-required-operations.v1'
const PLANNER_BACKEND_REPOSITORY = 'https://github.com/DenisChernykh/planner'
const PLANNER_BACKEND_ARTIFACT = 'docs/api/openapi.json'
const HTTP_METHODS = new Set([
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
])
const execFileAsync = promisify(execFile)

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertExactKeys(value, expectedKeys, label) {
  if (!isRecord(value)) throw new Error(`${label} must be an object`)

  const actual = Object.keys(value).sort()
  const expected = [...expectedKeys].sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} has unexpected or missing fields`)
  }
}

function parseJsonBytes(bytes, label) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new Error(`${label} is empty`)
  }

  try {
    return JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error(`${label} is not valid JSON`)
  }
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function validateSourceManifest(value) {
  assertExactKeys(
    value,
    ['artifactPath', 'repository', 'revision', 'schemaVersion', 'sha256'],
    'OpenAPI source manifest',
  )

  if (value.schemaVersion !== SOURCE_SCHEMA_VERSION) {
    throw new Error('OpenAPI source manifest has an unsupported schemaVersion')
  }
  if (value.repository !== PLANNER_BACKEND_REPOSITORY) {
    throw new Error('OpenAPI source manifest has an unexpected repository')
  }
  if (value.artifactPath !== PLANNER_BACKEND_ARTIFACT) {
    throw new Error('OpenAPI source manifest has an unexpected artifactPath')
  }
  if (!/^[0-9a-f]{40}$/u.test(value.revision)) {
    throw new Error('OpenAPI source manifest revision must be a full SHA')
  }
  if (!/^[0-9a-f]{64}$/u.test(value.sha256)) {
    throw new Error('OpenAPI source manifest sha256 is invalid')
  }

  return value
}

export function validateRequiredOperations(value) {
  assertExactKeys(
    value,
    ['operations', 'schemaVersion'],
    'Required operations manifest',
  )
  if (value.schemaVersion !== REQUIRED_OPERATIONS_SCHEMA_VERSION) {
    throw new Error(
      'Required operations manifest has an unsupported schemaVersion',
    )
  }
  if (!Array.isArray(value.operations) || value.operations.length === 0) {
    throw new Error('Required operations manifest must not be empty')
  }

  const identities = new Set()
  const operationIds = new Set()
  let previousSortKey = ''

  for (const operation of value.operations) {
    assertExactKeys(
      operation,
      ['method', 'operationId', 'path'],
      'Required operation',
    )
    if (!HTTP_METHODS.has(operation.method)) {
      throw new Error(
        `Unsupported required method: ${String(operation.method)}`,
      )
    }
    if (
      typeof operation.path !== 'string' ||
      !operation.path.startsWith('/') ||
      operation.path.includes('?') ||
      operation.path.includes('#')
    ) {
      throw new Error('Required operation path is invalid')
    }
    if (
      typeof operation.operationId !== 'string' ||
      operation.operationId.length === 0
    ) {
      throw new Error('Required operation operationId is invalid')
    }

    const identity = `${operation.method} ${operation.path}`
    if (identities.has(identity)) {
      throw new Error(`Duplicate required operation: ${identity}`)
    }
    if (operationIds.has(operation.operationId)) {
      throw new Error(
        `Duplicate required operationId: ${operation.operationId}`,
      )
    }
    identities.add(identity)
    operationIds.add(operation.operationId)

    const sortKey = `${operation.path}\u0000${operation.method}`
    if (sortKey < previousSortKey) {
      throw new Error('Required operations must be sorted by path and method')
    }
    previousSortKey = sortKey
  }

  return value
}

export function validateOpenApiDocument(value, requiredOperations) {
  if (
    !isRecord(value) ||
    typeof value.openapi !== 'string' ||
    !value.openapi.startsWith('3.') ||
    !isRecord(value.paths)
  ) {
    throw new Error('Expected a non-empty OpenAPI 3 JSON document')
  }

  for (const required of requiredOperations.operations) {
    const operation =
      value.paths[required.path]?.[required.method.toLowerCase()]
    if (!isRecord(operation)) {
      throw new Error(
        `OpenAPI document is missing ${required.method} ${required.path}`,
      )
    }
    if (operation.operationId !== required.operationId) {
      throw new Error(
        `OpenAPI document has an unexpected operationId for ${required.method} ${required.path}`,
      )
    }
  }

  return value
}

export function publishedArtifactUrl(manifest) {
  const repository = new URL(manifest.repository)
  const [owner, name] = repository.pathname.split('/').filter(Boolean)
  if (owner === undefined || name === undefined) {
    throw new Error('OpenAPI source repository URL is invalid')
  }

  return `https://raw.githubusercontent.com/${owner}/${name}/${manifest.revision}/${manifest.artifactPath}`
}

export async function resolveGitHubToken() {
  const environmentToken =
    process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim()
  if (environmentToken) return environmentToken

  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      timeout: 10_000,
    })
    return stdout.trim() || null
  } catch {
    return null
  }
}

export async function readOpenApiSource(
  source,
  fetchImplementation = fetch,
  requestInit,
) {
  if (/^https:\/\//u.test(source)) {
    const response = await fetchImplementation(source, requestInit)
    if (!response.ok) {
      throw new Error(`OpenAPI download failed with HTTP ${response.status}`)
    }
    return Buffer.from(await response.arrayBuffer())
  }
  if (/^http:\/\//u.test(source)) {
    throw new Error('OpenAPI source must use HTTPS')
  }

  const path = source.startsWith('file:')
    ? fileURLToPath(source)
    : resolve(process.cwd(), source)
  return readFile(path)
}

export async function loadOpenApiContract(root = process.cwd()) {
  const [manifestBytes, requiredBytes] = await Promise.all([
    readFile(resolve(root, OPENAPI_SOURCE_PATH)),
    readFile(resolve(root, REQUIRED_OPERATIONS_PATH)),
  ])

  return {
    manifest: validateSourceManifest(
      parseJsonBytes(manifestBytes, 'OpenAPI source manifest'),
    ),
    requiredOperations: validateRequiredOperations(
      parseJsonBytes(requiredBytes, 'Required operations manifest'),
    ),
  }
}

export function validateOpenApiBytes(bytes, manifest, requiredOperations) {
  const actualChecksum = sha256(bytes)
  if (actualChecksum !== manifest.sha256) {
    throw new Error(
      `OpenAPI checksum mismatch: expected ${manifest.sha256}, received ${actualChecksum}`,
    )
  }

  const document = parseJsonBytes(bytes, 'OpenAPI document')
  validateOpenApiDocument(document, requiredOperations)
  return document
}

async function writeExactAtomically(destination, bytes) {
  const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`
  try {
    await writeFile(temporary, bytes)
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
}

export async function syncOpenApi({
  root = process.cwd(),
  source,
  fetchImplementation,
  githubTokenResolver = resolveGitHubToken,
} = {}) {
  const { manifest, requiredOperations } = await loadOpenApiContract(root)
  const resolvedSource = source ?? publishedArtifactUrl(manifest)
  const githubToken = source === undefined ? await githubTokenResolver() : null
  const bytes = await readOpenApiSource(
    resolvedSource,
    fetchImplementation,
    githubToken === null
      ? undefined
      : { headers: { Authorization: `Bearer ${githubToken}` } },
  )
  validateOpenApiBytes(bytes, manifest, requiredOperations)
  await writeExactAtomically(resolve(root, OPENAPI_SNAPSHOT_PATH), bytes)
  return { bytes, manifest, source: resolvedSource }
}

export async function validateCommittedSnapshot(root = process.cwd()) {
  const { manifest, requiredOperations } = await loadOpenApiContract(root)
  const bytes = await readFile(resolve(root, OPENAPI_SNAPSHOT_PATH))
  const document = validateOpenApiBytes(bytes, manifest, requiredOperations)
  return { bytes, document, manifest, requiredOperations }
}

export async function pinOpenApi({
  revision,
  root = process.cwd(),
  fetchImplementation,
  githubTokenResolver = resolveGitHubToken,
} = {}) {
  if (!/^[0-9a-f]{40}$/u.test(revision ?? '')) {
    throw new Error('api:pin requires one published full lowercase Git SHA')
  }

  const { manifest: currentManifest, requiredOperations } =
    await loadOpenApiContract(root)
  const candidateManifest = {
    ...currentManifest,
    revision,
    sha256: '0'.repeat(64),
  }
  const source = publishedArtifactUrl(candidateManifest)
  const githubToken = await githubTokenResolver()
  const bytes = await readOpenApiSource(
    source,
    fetchImplementation,
    githubToken === null
      ? undefined
      : { headers: { Authorization: `Bearer ${githubToken}` } },
  )
  const document = parseJsonBytes(bytes, 'OpenAPI document')
  validateOpenApiDocument(document, requiredOperations)

  const manifest = validateSourceManifest({
    ...candidateManifest,
    sha256: sha256(bytes),
  })
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)

  await writeExactAtomically(resolve(root, OPENAPI_SNAPSHOT_PATH), bytes)
  await writeExactAtomically(resolve(root, OPENAPI_SOURCE_PATH), manifestBytes)
  return { bytes, manifest, source }
}
