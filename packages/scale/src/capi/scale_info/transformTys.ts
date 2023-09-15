/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * Adapted from https://github.com/paritytech/capi-old copyright Parity Technologies (APACHE License 2.0)
 * Changes August 19th 2023 :
 * - updated to use subshape for scale decoding
 * - adapted from deno to typescript
 *
   Copyright 2023 Parity Technologies

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as $ from "@talismn/subshape-fork"
import { AnyShape, Shape } from "@talismn/subshape-fork"

import { getOrInit } from "../util"
import { normalizeDocs, normalizeIdent, normalizeTypeName } from "../util/normalize"
import { overrides } from "./overrides/overrides"
import { $field, Ty } from "./raw/Ty"

/**
 * All derived codecs for ZSTs will use this exact codec,
 * so `derivedCodec === $null` is true iff the type is a ZST.
 */
export const $null = $.withMetadata($.metadata("$null"), $.constant(null))

export interface ScaleInfo {
  ids: AnyShape[]
  types: Record<string, AnyShape>
  paths: Record<string, AnyShape>
}
export function transformTys(tys: Ty[]): ScaleInfo {
  const tysMap = new Map(tys.map((ty) => [ty.id, ty]))
  const memo = new Map<number, AnyShape>()
  const types: Record<string, AnyShape> = {}
  const paths: Record<string, AnyShape> = {}
  const seenPaths = new Map<string, Ty | null>()
  const includePaths = new Set<string>()
  const names = new Map<string, string>()
  const nameCounts = new Map<string, Map<string, number>>()

  for (const ty of tys) {
    const path = ty.path.join("::")
    if (!path) continue
    const last = seenPaths.get(path)
    if (last !== undefined) {
      if (last === null || !eqTy(tysMap, last.id, ty.id)) {
        seenPaths.set(path, null)
        includePaths.delete(path)
      }
      continue
    }
    seenPaths.set(path, ty)
    includePaths.add(path)
  }

  for (const path of includePaths) {
    const parts = path.split("::")
    const name = parts.at(-1)!
    const map = getOrInit(nameCounts, name, () => new Map())
    for (let i = 0; i < parts.length; i++) {
      const pathPart = parts.slice(0, i).join("::")
      map.set(pathPart, (map.get(pathPart) ?? 0) + 1)
    }
  }

  for (const path of includePaths) {
    const parts = path.split("::")
    const name = parts.at(-1)!
    const map = nameCounts.get(name)!
    const pathLength = parts.findIndex((_, i) => map.get(parts.slice(0, i).join("::")) === 1)
    const newPath = [...parts.slice(0, pathLength), name].join("::")
    const newName = normalizeTypeName(newPath)
    names.set(path, newName)
  }

  return { ids: tys.map((ty) => visit(ty.id)), types, paths }

  function visit(i: number): $.AnyShape {
    return getOrInit(memo, i, () => {
      memo.set(
        i,
        $.deferred(() => memo.get(i)!)
      )
      const ty = tysMap.get(i)!
      const path = ty.path.join("::")
      const usePath = includePaths.has(path)
      const name = names.get(path)!
      if (usePath && types[name]) return types[name]!
      const codec = withDocs(ty.docs, _visit(ty))
      if (usePath) return (types[name] ??= paths[path] = codec)
      return codec
    })
  }

  function _visit(ty: Ty): $.AnyShape {
    const overrideFn = overrides[ty.path.join("::")]
    if (overrideFn) return overrideFn(ty, visit)
    if (ty.type === "Struct") {
      if (ty.fields.length === 0) {
        return $null
      } else if (ty.fields[0]!.name === undefined) {
        if (ty.fields.length === 1) {
          // wrapper
          return visit(ty.fields[0]!.ty)
        } else {
          return $.tuple(...ty.fields.map((x) => visit(x.ty)))
        }
      } else {
        return $.object(
          ...ty.fields.map((x) =>
            withDocs(x.docs, maybeOptionalField(normalizeIdent(x.name!), visit(x.ty)))
          )
        )
      }
    } else if (ty.type === "Tuple") {
      if (ty.fields.length === 0) {
        return $null
      } else if (ty.fields.length === 1) {
        // wrapper
        return visit(ty.fields[0]!)
      } else {
        return $.tuple(...ty.fields.map((x) => visit(x)))
      }
    } else if (ty.type === "Union") {
      if (ty.members.length === 0) {
        return $.never as any
      } else if (ty.members.every((x) => x.fields.length === 0)) {
        const members: Record<number, string> = {}
        for (const { index, name } of ty.members) {
          members[index] = normalizeIdent(name)
        }
        return $.literalUnion(members)
      } else {
        const members: Record<number, $.Variant<any, never, unknown>> = {}
        for (const { fields, name, index } of ty.members) {
          let member: $.Variant<any, never, unknown>
          const type = normalizeIdent(name)
          if (fields.length === 0) {
            member = $.variant(type)
          } else if (fields[0]!.name === undefined) {
            // Tuple variant
            const $value =
              fields.length === 1
                ? visit(fields[0]!.ty)
                : $.tuple(...fields.map((f) => visit(f.ty)))
            member = $.variant(type, maybeOptionalField("value", $value))
          } else {
            // Object variant
            const memberFields = fields.map((field) => {
              return withDocs(
                field.docs,
                maybeOptionalField(normalizeIdent(field.name!), visit(field.ty))
              )
            })
            member = $.variant(type, ...memberFields)
          }
          members[index] = member
        }
        return $.taggedUnion("type", members)
      }
    } else if (ty.type === "Sequence") {
      const $inner = visit(ty.typeParam)
      if ($inner === $.u8) {
        return $.uint8Array
      } else {
        return $.array($inner)
      }
    } else if (ty.type === "SizedArray") {
      const $inner = visit(ty.typeParam)
      if ($inner === $.u8) {
        return $.sizedUint8Array(ty.len)
      } else {
        return $.sizedArray($inner, ty.len)
      }
    } else if (ty.type === "Primitive") {
      if (ty.kind === "char") return $.str
      return $[ty.kind]
    } else if (ty.type === "Compact") {
      return $.compact(visit(ty.typeParam))
    } else if (ty.type === "BitSequence") {
      return $.bitSequence
    } else {
      throw new Error("unreachable")
    }
  }
}

function withDocs<I, O>(_docs: string[], codec: Shape<I, O>): Shape<I, O> {
  const docs = normalizeDocs(_docs)
  if (docs) return $.documented(docs, codec)
  return codec
}

function eqTy(tysMap: Map<number, Ty>, a: number, b: number) {
  const seen = new Set<string>()
  return eqTy(a, b)

  function eqTy(ai: number, bi: number): boolean {
    const key = `${ai}=${bi}`
    if (seen.has(key)) return true
    seen.add(key)
    const a = tysMap.get(ai)!
    const b = tysMap.get(bi)!
    if (a.id === b.id) return true
    if (a.type !== b.type) return false
    if (a.path.join("::") !== b.path.join("::")) return false
    if (normalizeDocs(a.docs) !== normalizeDocs(b.docs)) return false
    if (
      !eqArray<any>(
        a.params,
        b.params,
        (a, b) =>
          a.name === b.name &&
          (a.ty == null) === (b.ty == null) &&
          (a.ty == null || eqTy(a.ty!, b.ty!))
      )
    ) {
      return false
    }
    if (a.type === "BitSequence") {
      return true
    }
    if (a.type === "Primitive" && b.type === "Primitive") {
      return a.kind === b.kind
    }
    if (
      (a.type === "Compact" && b.type === "Compact") ||
      (a.type === "Sequence" && b.type === "Sequence")
    ) {
      return eqTy(a.typeParam, b.typeParam)
    }
    if (a.type === "SizedArray" && b.type === "SizedArray") {
      return a.len === b.len && eqTy(a.typeParam, b.typeParam)
    }
    if (a.type === "Struct" && b.type === "Struct") {
      return eqArray(a.fields, b.fields, eqField)
    }
    if (a.type === "Tuple" && b.type === "Tuple") {
      return eqArray(a.fields, b.fields, eqTy)
    }
    if (a.type === "Union" && b.type === "Union") {
      return eqArray<any>(
        a.members,
        b.members,
        (a, b) =>
          a.index === b.index &&
          a.name === b.name &&
          normalizeDocs(a.docs) === normalizeDocs(b.docs) &&
          eqArray(a.fields, b.fields, eqField)
      )
    }
    return false
  }

  function eqField(a: $.Output<typeof $field>, b: $.Output<typeof $field>) {
    return (
      a.name === b.name && a.typeName === b.typeName && eqDocs(a.docs, b.docs) && eqTy(a.ty, b.ty)
    )
  }

  function eqDocs(a: string[], b: string[]) {
    return normalizeDocs(a) === normalizeDocs(b)
  }

  function eqArray<T>(a: T[], b: T[], eqVal: (a: T, b: T) => boolean) {
    return a.length === b.length && a.every((x, i) => eqVal(x, b[i]!))
  }
}

const optionInnerVisitor = new $.ShapeVisitor<$.AnyShape | null>()
  .add($.option, (_codec, $some) => $some)
  .fallback(() => null)
function maybeOptionalField(key: PropertyKey, $value: $.AnyShape): $.AnyShape {
  const $inner = optionInnerVisitor.visit($value)
  return $inner ? $.optionalField(key, $inner) : $.field(key, $value)
}
