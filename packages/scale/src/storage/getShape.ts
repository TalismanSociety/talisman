/**
 * This module is largely copied from https://github.com/0xKheops/substrate-metadata-explorer/blob/4b5a991e5ced45cad3b8675ff9104b8366d20429/packages/sme-codegen/src/types/getShape.ts
 *
 * The primary difference between this module and `sme-codegen` is in the output.
 *
 * The `sme-codegen` module exports typescript code as a string, which can then be interpretted in order to construct subshape objects.
 *
 * Whereas this module directly exports the subshape objects described by that code.
 */

import * as $ from "@talismn/subshape-fork"

import { MetadataV14, Ty, normalizeIdent } from "../capi"
import { getTypeName } from "./getTypeName"

type GotShapes = Map<string, $.AnyShape>

export const getShape = (
  metadata: MetadataV14,
  typeId: number,
  gotShapes: GotShapes = new Map()
): $.AnyShape => {
  const type = metadata.tys.find((type) => type.id === typeId)
  if (!type) throw new Error(`Type not found (${typeId})`)

  // Short circuit if we've already encountered this shape
  const typeName = getTypeName(metadata, type)
  if (gotShapes.has(typeName)) return gotShapes.get(typeName)!

  // TODO: Use `$.deferred(() => Type)` for self-referential types

  // Get shape, add to gotShapes list, return shape
  const shape = getTypeShape(metadata, type, gotShapes)
  gotShapes.set(typeName, shape)

  return shape
}

export const getTypeShape = (metadata: MetadataV14, type: Ty, gotShapes: GotShapes): $.AnyShape => {
  const tyType = type.type
  switch (tyType) {
    case "Primitive":
      return getPrimitiveShape(type)
    case "SizedArray":
      return getSizedArrayShape(metadata, type, gotShapes)
    case "Compact":
      return getCompactShape(metadata, type, gotShapes)
    case "Sequence":
      return getSequenceShape(metadata, type, gotShapes)
    case "Struct":
      return getStructShape(metadata, type, gotShapes)
    case "Tuple":
      return getTupleShape(metadata, type, gotShapes)
    case "Union":
      return getUnionShape(metadata, type, gotShapes)
    case "BitSequence":
      return $.bitSequence
    default: {
      // force compilation error if any types don't have a case
      const exhaustiveCheck: never = tyType
      throw new Error(`Unsupported type shape ${exhaustiveCheck}`)
    }
  }
}

const tyIsU8 = (type?: Ty): boolean => type?.type === "Primitive" && type.kind === "u8"

const getPrimitiveShape = (primitive: Extract<Ty, { type: "Primitive" }>): $.AnyShape => {
  // TODO: Test that `char` and `$.u8` are equivalent (`$.char` does not exist)
  if (primitive.kind === "char") return $.u8
  return $[primitive.kind]
}

const getSizedArrayShape = (
  metadata: MetadataV14,
  sizedArray: Extract<Ty, { type: "SizedArray" }>,
  gotShapes: GotShapes
): $.AnyShape => {
  // Get the type definition for the items of this array from the metadata
  const typeParam = metadata.tys.find(({ id }) => id === sizedArray.typeParam)
  if (!typeParam) {
    const typeName = getTypeName(metadata, sizedArray)
    throw new Error(`Could not find typeParam ${sizedArray.typeParam} for sizedArray ${typeName}`)
  }

  // Shortcut for uint8 arrays
  if (tyIsU8(typeParam)) return $.sizedUint8Array(sizedArray.len)

  // Get the subshape object for the items of this array
  const typeParamShape = getShape(metadata, typeParam.id, gotShapes)

  // Return a subshape sizedArray
  return $.sizedArray(typeParamShape, sizedArray.len)
}

const getCompactShape = (
  metadata: MetadataV14,
  compact: Extract<Ty, { type: "Compact" }>,
  gotShapes: GotShapes
): $.AnyShape => {
  // Get the type definition for the item of this compact from the metadata
  const typeParam = metadata.tys.find(({ id }) => id === compact.typeParam)
  if (!typeParam) {
    const typeName = getTypeName(metadata, compact)
    throw new Error(`Could not find typeParam ${compact.typeParam} for compact ${typeName}`)
  }

  // Get the subshape object for the item of this compact
  const typeParamShape = getShape(metadata, typeParam.id, gotShapes)

  // Return a subshape compact
  return $.compact(typeParamShape)
}

const getSequenceShape = (
  metadata: MetadataV14,
  sequence: Extract<Ty, { type: "Sequence" }>,
  gotShapes: GotShapes
): $.AnyShape => {
  // Get the type definition for the items of this sequence from the metadata
  const typeParam = metadata.tys.find(({ id }) => id === sequence.typeParam)
  if (!typeParam) {
    const typeName = getTypeName(metadata, sequence)
    throw new Error(`Could not find typeParam ${sequence.typeParam} for sequence ${typeName}`)
  }

  // Shortcut for uint8 sequences
  if (tyIsU8(typeParam)) return $.uint8Array

  // Get the subshape object for the items of this sequence
  const typeParamShape = getShape(metadata, typeParam.id, gotShapes)

  // Return a subshape sequence
  return $.array(typeParamShape)
}

const getStructShape = (
  metadata: MetadataV14,
  struct: Extract<Ty, { type: "Struct" }>,
  gotShapes: GotShapes
): $.AnyShape => {
  // If there's only one field and it has no name, don't wrap it in $.object
  if (struct.fields.length === 1 && !struct.fields[0].name)
    return getShape(metadata, struct.fields[0].ty, gotShapes)

  // Check that all fields have a name
  if (!struct.fields.every((field) => field.name)) {
    const typeName = getTypeName(metadata, struct)
    throw new Error(
      `Could not build subshape object for struct ${struct.id} (${typeName})): Not all fields have a name`
    )
  }

  // Get the type definition for the fields of this struct from the metadata
  const fieldsShape: $.AnyShape[] = struct.fields.map((field) =>
    $.field(normalizeIdent(field.name!), getShape(metadata, field.ty, gotShapes))
  )

  return $.object(...fieldsShape)
}

const getTupleShape = (
  metadata: MetadataV14,
  tuple: Extract<Ty, { type: "Tuple" }>,
  gotShapes: GotShapes
): $.AnyShape =>
  // Get the type definition for the fields of this tuple from the metadata and wrap them in `$.tuple`
  $.tuple(...tuple.fields.map((type) => getShape(metadata, type, gotShapes)))

const getUnionShape = (
  metadata: MetadataV14,
  union: Extract<Ty, { type: "Union" }>,
  gotShapes: GotShapes
): $.AnyShape => {
  if (union.members.every((member) => !member.fields.length))
    return $.literalUnion(
      Object.fromEntries(union.members.map((member) => [member.index, normalizeIdent(member.name)]))
    )

  // TODO: Check if invalid
  if (
    union.members.length === 2 &&
    union.path[union.path.length - 1] === "Option" &&
    union.members[0]?.name === "None" &&
    union.members[1]?.name === "Some"
  )
    return $.option(getShape(metadata, union.members[1].fields[0].ty, gotShapes))

  return $.taggedUnion(
    "type",
    Object.fromEntries(
      union.members.map((member) => {
        const args: $.AnyShape[] = []

        // invalid if only some fields (but not all of them) have a name
        if (
          member.fields.some((field) => field.name) &&
          !member.fields.every((field) => field.name)
        ) {
          const typeName = getTypeName(metadata, union)
          throw new Error(
            `Could not build subshape object for union ${union.id} (${typeName}): Not all fields have a name`
          )
        }

        if (member.fields.every((field) => field.name))
          for (const field of member.fields)
            args.push($.field(normalizeIdent(field.name!), getShape(metadata, field.ty, gotShapes)))
        else if (member.fields.length > 1)
          args.push(
            $.field(
              "value",
              $.tuple(...member.fields.map((field) => getShape(metadata, field.ty, gotShapes)))
            )
          )
        else args.push($.field("value", getShape(metadata, member.fields[0].ty, gotShapes)))

        return [member.index, $.variant(normalizeIdent(member.name), ...args)]
      })
    )
  )
}
