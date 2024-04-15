/**
 * This module is largely copied from https://github.com/0xKheops/substrate-metadata-explorer/blob/4b5a991e5ced45cad3b8675ff9104b8366d20429/packages/sme-codegen/src/types/getConstantVariableName.ts
 *
 * The primary difference between this module and `sme-codegen` is in the output.
 *
 * The `sme-codegen` module exports typescript code as a string, which can then be interpretted in order to construct subshape objects.
 *
 * Whereas this module directly exports the subshape objects described by that code.
 */

import { MetadataV14, Ty, normalizeTypeName } from "../capi"

/** Returns a unique name (relative to all of the types in `metadata`) to identify this type. */
export const getTypeName = (metadata: MetadataV14, type: Ty) => {
  const uniqueName = getUniqueTypeName(metadata, type)
  return `${uniqueName.charAt(0).toUpperCase()}${uniqueName.substring(1)}`
}

/**
 * Tries each of `getSimpleTypeName`, `getSmartTypeName`, `getFullTypeName` in order and
 * returns the first name which is unique in the collection of types in `metadata`.
 */
export const getUniqueTypeName = (metadata: MetadataV14, type: Ty) => {
  const rawTypeName = getRawTypeName(type)
  if (type.path.length < 1) return rawTypeName

  // use simpleName if it is unique
  const simpleName = getSimpleTypeName(type)
  if (!metadata.tys.some((t) => t.id !== type.id && getSimpleTypeName(t) === simpleName))
    return simpleName

  // use smartName if it is unique
  const smartName = getSmartTypeName(type)
  if (!metadata.tys.some((t) => t.id !== type.id && getSmartTypeName(t) === smartName))
    return smartName

  // use fullName if it is unique
  const fullName = getFullTypeName(type)
  if (!metadata.tys.some((t) => t.id !== type.id && getFullTypeName(t) === fullName))
    // return if fullName is unique
    return fullName

  // use fullName + type number
  return `${fullName}${type.id}`
}

/** Gets "Type" + type number */
export const getRawTypeName = (type: Ty) => `Type${type.id}`

/** Gets the last element of `type.path` */
export const getSimpleTypeName = (type: Ty) => type.path.slice(-1)[0]

/** Gets the first two elements, and the last element, of `type.path` and joins them together with `::` */
export const getSmartTypeName = (type: Ty) =>
  type.path.length > 3
    ? normalizeTypeName([...type.path.slice(0, 2), ...type.path.slice(-1)].join("::"))
    : getFullTypeName(type)

/** Gets all elements of `type.path` and joins them together with `::` */
export const getFullTypeName = (type: Ty) => normalizeTypeName(type.path.join("::"))
