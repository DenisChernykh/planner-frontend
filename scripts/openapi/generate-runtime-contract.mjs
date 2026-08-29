import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { validateCommittedSnapshot } from './openapi-contract.mjs'

const HTTP_METHODS = new Set([
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
])
const PROBLEM_MEDIA_TYPE = 'application/problem+json'
const JSON_MEDIA_TYPE = 'application/json'
const TELEGRAM_OIDC_CALLBACK_PATH = '/auth/telegram/callback'
const TELEGRAM_OIDC_RESULT_LOCATION_PREFIX = '/auth/telegram/result?result='

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function pascal(value) {
  return value
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join('')
}

function tagFileName(tag) {
  return tag
    .trim()
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replace(/[^A-Za-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .toLowerCase()
}

function resolveLocalReference(document, reference) {
  if (typeof reference !== 'string' || !reference.startsWith('#/')) {
    throw new Error(`Unsupported OpenAPI reference: ${String(reference)}`)
  }

  return reference
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, part) => value?.[part], document)
}

function collectTopLevelProblemCodes(
  document,
  schema,
  target,
  seen = new Set(),
) {
  if (!isRecord(schema)) return
  if (typeof schema.$ref === 'string') {
    if (seen.has(schema.$ref)) return
    seen.add(schema.$ref)
    collectTopLevelProblemCodes(
      document,
      resolveLocalReference(document, schema.$ref),
      target,
      seen,
    )
    return
  }

  const codeEnum = schema.properties?.code?.enum
  if (Array.isArray(codeEnum)) {
    for (const code of codeEnum) {
      if (typeof code === 'string') target.add(code)
    }
  }

  for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
    const branches = schema[keyword]
    if (!Array.isArray(branches)) continue
    for (const branch of branches) {
      collectTopLevelProblemCodes(document, branch, target, new Set(seen))
    }
  }
}

function operationEntries(document) {
  const entries = []

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (!isRecord(pathItem)) continue
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !isRecord(operation)) continue
      if (typeof operation.operationId !== 'string') continue
      entries.push({ method: method.toUpperCase(), operation, path })
    }
  }

  return entries.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.method.localeCompare(right.method),
  )
}

function collectProblemCodes(document, entries) {
  const codes = new Set()
  for (const { operation } of entries) {
    for (const [status, response] of Object.entries(
      operation.responses ?? {},
    )) {
      if (!/^[45]\d\d$/u.test(status) || !isRecord(response)) continue
      const schema = response.content?.[PROBLEM_MEDIA_TYPE]?.schema
      collectTopLevelProblemCodes(document, schema, codes)
    }
  }
  if (codes.size === 0) {
    throw new Error('OpenAPI document declares no Problem Details codes')
  }
  return [...codes].sort()
}

function collectSuccessContracts(entries) {
  const contracts = []
  for (const { method, operation, path } of entries) {
    const responses = []
    const tag = operation.tags?.[0]
    if (typeof tag !== 'string' || tag.trim() === '') {
      throw new Error(`${operation.operationId} must have a tag for generation`)
    }

    for (const [statusText, response] of Object.entries(
      operation.responses ?? {},
    )) {
      if (!/^2\d\d$/u.test(statusText) || !isRecord(response)) continue
      const status = Number(statusText)
      const content = response.content

      if (content === undefined || Object.keys(content).length === 0) {
        responses.push({ mediaType: null, schema: null, status })
        continue
      }
      if (!isRecord(content) || !isRecord(content[JSON_MEDIA_TYPE])) {
        throw new Error(
          `${operation.operationId} has an unsupported success media type`,
        )
      }

      responses.push({
        mediaType: JSON_MEDIA_TYPE,
        schema: `${pascal(operation.operationId)}${status}Response`,
        status,
      })
    }

    if (responses.length > 0) {
      contracts.push({
        importPath: `./${tagFileName(tag)}/${tagFileName(tag)}.zod`,
        method,
        operationId: operation.operationId,
        path,
        responses: responses.sort((left, right) => left.status - right.status),
      })
    }
  }
  return contracts
}

function collectTelegramOidcResultCodes(document) {
  const operation = document.paths?.[TELEGRAM_OIDC_CALLBACK_PATH]?.get
  if (
    !isRecord(operation) ||
    operation.operationId !== 'completeTelegramOidcLogin'
  ) {
    throw new Error('Telegram OIDC callback operation is missing')
  }

  const response = operation.responses?.['303']
  const locationHeader = isRecord(response)
    ? response.headers?.Location
    : undefined
  const locationSchema = isRecord(locationHeader)
    ? locationHeader.schema
    : undefined
  const locations = isRecord(locationSchema) ? locationSchema.enum : undefined
  if (!Array.isArray(locations) || locations.length === 0) {
    throw new Error('Telegram OIDC result Location enum is missing')
  }

  const codes = locations.map((location) => {
    if (
      typeof location !== 'string' ||
      !location.startsWith(TELEGRAM_OIDC_RESULT_LOCATION_PREFIX)
    ) {
      throw new Error('Telegram OIDC result Location is not a fixed safe route')
    }
    const code = location.slice(TELEGRAM_OIDC_RESULT_LOCATION_PREFIX.length)
    if (!/^[a-z][a-z0-9_]*$/u.test(code)) {
      throw new Error('Telegram OIDC result code is invalid')
    }
    return code
  })

  if (new Set(codes).size !== codes.length) {
    throw new Error('Telegram OIDC result codes must be unique')
  }
  return codes
}

async function assertGeneratedSchemas(root, contracts) {
  const imports = new Map()
  for (const contract of contracts) {
    for (const response of contract.responses) {
      if (response.schema === null) continue
      const symbols = imports.get(contract.importPath) ?? new Set()
      symbols.add(response.schema)
      imports.set(contract.importPath, symbols)
    }
  }

  for (const [importPath, symbols] of imports) {
    const generatedPath = resolve(
      root,
      'src/shared/api/generated-zod',
      `${importPath.slice(2)}.ts`,
    )
    const source = await readFile(generatedPath, 'utf8')
    for (const symbol of symbols) {
      if (!source.includes(`export const ${symbol} =`)) {
        throw new Error(
          `Orval output ${generatedPath} does not export ${symbol}`,
        )
      }
    }
  }

  return imports
}

function generatedHeader() {
  return [
    '/**',
    ' * Generated from openapi/openapi.json by scripts/openapi/generate-runtime-contract.mjs.',
    ' * Do not edit manually.',
    ' */',
  ]
}

function renderProblemCodes(problemCodes) {
  return [
    ...generatedHeader(),
    `export const GENERATED_PROBLEM_CODES = ${JSON.stringify(problemCodes, null, 2)} as const`,
    '',
    'export type GeneratedProblemCode =',
    '  (typeof GENERATED_PROBLEM_CODES)[number]',
    '',
  ].join('\n')
}

function renderContractSource(manifest) {
  return [
    ...generatedHeader(),
    `export const OPENAPI_CONTRACT_SOURCE = ${JSON.stringify(
      {
        revision: manifest.revision,
        sha256: manifest.sha256,
      },
      null,
      2,
    )} as const`,
    '',
  ].join('\n')
}

function renderTelegramOidcResultCodes(codes) {
  return [
    ...generatedHeader(),
    "import { z } from 'zod'",
    '',
    `export const TELEGRAM_OIDC_RESULT_CODES = ${JSON.stringify(codes, null, 2)} as const`,
    '',
    'export type TelegramOidcResultCode =',
    '  (typeof TELEGRAM_OIDC_RESULT_CODES)[number]',
    '',
    'export const TelegramOidcResultCodeSchema = z.enum(',
    '  TELEGRAM_OIDC_RESULT_CODES,',
    ')',
    '',
  ].join('\n')
}

function renderSuccessContracts(contracts, imports) {
  const lines = [...generatedHeader(), "import type { ZodType } from 'zod'", '']

  const sortedImports = [...imports].sort(([left], [right]) =>
    left.localeCompare(right),
  )
  const loaderNames = new Map()
  for (const [importPath] of sortedImports) {
    const tag = importPath.split('/').at(-2) ?? importPath
    const loaderName = `load${pascal(tag)}Schemas`
    loaderNames.set(importPath, loaderName)
    lines.push(`const ${loaderName} = () => import('${importPath}')`)
  }

  lines.push(
    '',
    'export type GeneratedSuccessResponse =',
    "  | { readonly status: number; readonly mediaType: 'application/json'; readonly loadSchema: () => Promise<ZodType<unknown>> }",
    '  | { readonly status: number; readonly mediaType: null; readonly loadSchema: null }',
    '',
    'export type GeneratedSuccessResponseContract = Readonly<{',
    '  method: string',
    '  operationId: string',
    '  path: string',
    '  responses: readonly GeneratedSuccessResponse[]',
    '}>',
    '',
    'export const GENERATED_SUCCESS_RESPONSE_CONTRACTS = [',
  )

  for (const contract of contracts) {
    lines.push('  {')
    lines.push(`    method: ${JSON.stringify(contract.method)},`)
    lines.push(`    operationId: ${JSON.stringify(contract.operationId)},`)
    lines.push(`    path: ${JSON.stringify(contract.path)},`)
    lines.push('    responses: [')
    for (const response of contract.responses) {
      lines.push('      {')
      lines.push(`        status: ${response.status},`)
      lines.push(`        mediaType: ${JSON.stringify(response.mediaType)},`)
      lines.push(
        response.schema === null
          ? '        loadSchema: null,'
          : `        loadSchema: async () => (await ${loaderNames.get(contract.importPath)}()).${response.schema},`,
      )
      lines.push('      },')
    }
    lines.push('    ],')
    lines.push('  },')
  }

  lines.push(
    '] as const satisfies readonly GeneratedSuccessResponseContract[]',
    '',
  )
  return lines.join('\n')
}

export async function generateRuntimeContract(root = process.cwd()) {
  const { document, manifest } = await validateCommittedSnapshot(root)
  const entries = operationEntries(document)
  const problemCodes = collectProblemCodes(document, entries)
  const contracts = collectSuccessContracts(entries)
  const telegramOidcResultCodes = collectTelegramOidcResultCodes(document)
  const imports = await assertGeneratedSchemas(root, contracts)
  const problemCodesDestination = resolve(
    root,
    'src/shared/api/generated-zod/problem-codes.ts',
  )
  const successContractsDestination = resolve(
    root,
    'src/shared/api/generated-zod/success-contracts.ts',
  )
  const contractSourceDestination = resolve(
    root,
    'src/shared/api/generated-zod/contract-source.ts',
  )
  const telegramOidcResultCodesDestination = resolve(
    root,
    'src/shared/api/generated-zod/telegram-oidc-result.ts',
  )
  await mkdir(dirname(problemCodesDestination), { recursive: true })
  await Promise.all([
    writeFile(contractSourceDestination, renderContractSource(manifest)),
    writeFile(problemCodesDestination, renderProblemCodes(problemCodes)),
    writeFile(
      telegramOidcResultCodesDestination,
      renderTelegramOidcResultCodes(telegramOidcResultCodes),
    ),
    writeFile(
      successContractsDestination,
      renderSuccessContracts(contracts, imports),
    ),
  ])
  return {
    contracts,
    destinations: [
      contractSourceDestination,
      problemCodesDestination,
      successContractsDestination,
      telegramOidcResultCodesDestination,
    ],
    problemCodes,
    telegramOidcResultCodes,
  }
}

const result = await generateRuntimeContract()
process.stdout.write(
  `Generated ${result.contracts.length} success contracts, ${result.problemCodes.length} Problem codes and ${result.telegramOidcResultCodes.length} Telegram OIDC result codes\n`,
)
