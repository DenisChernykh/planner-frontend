/**
 * Orval 8.23.0 renders OpenAPI 3.0 `enum: [null]` schemas as an empty
 * TypeScript union. Adding a nullable base type keeps the schema semantics
 * (`null` is still the only enum member) while giving Orval enough information
 * to emit the `null` literal type.
 *
 * The committed OpenAPI snapshot is never modified: Orval invokes this
 * transformer with an in-memory copy of the document.
 */
export default function normalizeOrvalInput(document) {
  const normalized = structuredClone(document)
  let normalizedNullEnums = 0

  function isUntypedNullEnum(value) {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value.type === undefined &&
      Array.isArray(value.enum) &&
      value.enum.length === 1 &&
      value.enum[0] === null
    )
  }

  function visit(value) {
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }

    if (value === null || typeof value !== 'object') return

    for (const unionKeyword of ['anyOf', 'oneOf']) {
      const branches = value[unionKeyword]
      if (!Array.isArray(branches)) continue

      const nonNullBranches = branches.filter(
        (branch) => !isUntypedNullEnum(branch),
      )
      const removedBranches = branches.length - nonNullBranches.length

      if (removedBranches > 0 && nonNullBranches.length > 0) {
        value[unionKeyword] = nonNullBranches
        value.nullable = true
        normalizedNullEnums += removedBranches
      }
    }

    if (isUntypedNullEnum(value)) {
      value.type = 'string'
      value.nullable = true
      normalizedNullEnums += 1
    }

    for (const child of Object.values(value)) visit(child)
  }

  visit(normalized)

  if (normalizedNullEnums === 0) {
    throw new Error(
      'Expected at least one untyped enum: [null] schema in the Planner OpenAPI snapshot',
    )
  }

  return normalized
}
