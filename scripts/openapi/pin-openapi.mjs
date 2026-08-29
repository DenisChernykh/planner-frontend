import { pinOpenApi } from './openapi-contract.mjs'

const revision = process.argv[2]
const result = await pinOpenApi({ revision })

process.stdout.write(
  `Pinned OpenAPI ${result.manifest.revision} with sha256 ${result.manifest.sha256}\n`,
)
