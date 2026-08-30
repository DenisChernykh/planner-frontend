import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { syncOpenApi } from './openapi-contract.mjs'

export { syncOpenApi } from './openapi-contract.mjs'

async function main() {
  const source = process.env.OPENAPI_SPEC_SOURCE
  const result = await syncOpenApi({ source })
  process.stdout.write(
    `OpenAPI snapshot updated byte-for-byte from ${result.source}\n`,
  )
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main()
}
