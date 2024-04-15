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

import * as $ from "@talismn/subshape-fork"

import {
  blake2_128,
  blake2_128Concat,
  blake2_256,
  identity,
  twox128,
  twox256,
  twox64Concat,
} from "../../crypto"
import { $ty, $tyId } from "../../scale_info/raw/Ty"
import { $null, transformTys } from "../../scale_info/transformTys"
import { normalizeDocs, normalizeIdent } from "../../util/normalize"
import { Constant, FrameMetadata, Pallet, StorageEntry } from "../FrameMetadata"
import {
  $emptyKey,
  $partialEmptyKey,
  $partialMultiKey,
  $partialSingleKey,
  $storageKey,
} from "../key_codecs"

const hashers = {
  blake2_128,
  blake2_256,
  blake2_128Concat,
  twox128,
  twox256,
  twox64Concat,
  identity,
}

const $hasher = $.literalUnion<keyof typeof hashers>([
  "blake2_128",
  "blake2_256",
  "blake2_128Concat",
  "twox128",
  "twox256",
  "twox64Concat",
  "identity",
])

const $storageEntry = $.object(
  $.field("name", $.str),
  $.field("modifier", $.literalUnion(["Optional", "Default"])),
  $.taggedUnion("type", [
    $.variant("Plain", $.field("value", $tyId)),
    $.variant(
      "Map",
      $.field("hashers", $.array($hasher)),
      $.field("key", $tyId),
      $.field("value", $tyId)
    ),
  ]),
  $.field("default", $.uint8Array),
  $.field("docs", $.array($.str))
)

const $constant = $.object(
  $.field("name", $.str),
  $.field("ty", $tyId),
  $.field("value", $.uint8Array),
  $.field("docs", $.array($.str))
)

const $pallet = $.object(
  $.field("name", $.str),
  $.optionalField(
    "storage",
    $.object($.field("prefix", $.str), $.field("entries", $.array($storageEntry)))
  ),
  $.optionalField("calls", $tyId),
  $.optionalField("event", $tyId),
  $.field("constants", $.array($constant)),
  $.optionalField("error", $tyId),
  $.field("id", $.u8)
)

const $extrinsicDef = $.object(
  $.field("ty", $tyId),
  $.field("version", $.u8),
  $.field(
    "signedExtensions",
    $.array(
      $.object($.field("ident", $.str), $.field("ty", $tyId), $.field("additionalSigned", $tyId))
    )
  )
)

// https://docs.substrate.io/build/application-development/#metadata-system
const magicNumber = 1635018093

export const $metadata = $.object(
  $.field("magicNumber", $.constant<typeof magicNumber>(magicNumber, $.u32)),
  $.field("version", $.constant<14>(14, $.u8)),
  $.field("tys", $.array($ty)),
  $.field("pallets", $.array($pallet)),
  $.field("extrinsic", $extrinsicDef),
  // TODO: is this useful?
  $.field("runtime", $tyId)
)

export function transformMetadata(metadata: $.Output<typeof $metadata>): FrameMetadata {
  const { ids, types, paths } = transformTys(metadata.tys)

  return {
    types,
    paths,
    pallets: Object.fromEntries(
      metadata.pallets.map((pallet): [string, Pallet] => [
        pallet.name,
        {
          id: pallet.id,
          name: pallet.name,
          storagePrefix: pallet.storage?.prefix ?? pallet.name,
          storage: Object.fromEntries(
            pallet.storage?.entries.map((storage): [string, StorageEntry] => {
              let key, partialKey
              if (storage.type === "Plain") {
                key = $emptyKey
                partialKey = $partialEmptyKey
              } else if (storage.hashers.length === 1) {
                key = hashers[storage.hashers[0]!].$hash(ids[storage.key]!)
                partialKey = $partialSingleKey(key)
              } else {
                const codecs = extractTupleMembersVisitor
                  .visit(ids[storage.key]!)
                  .map((codec, i) => hashers[storage.hashers[i]!].$hash(codec))
                key = $.tuple(...codecs)
                partialKey = $partialMultiKey(...codecs)
              }
              return [
                storage.name,
                {
                  singular: storage.type === "Plain",
                  name: storage.name,
                  key: $storageKey(pallet.name, storage.name, key),
                  partialKey: $storageKey(pallet.name, storage.name, partialKey),
                  value: ids[storage.value]!,
                  docs: normalizeDocs(storage.docs),
                  default: storage.modifier === "Default" ? storage.default : undefined,
                },
              ]
            }) ?? []
          ),
          constants: Object.fromEntries(
            pallet.constants.map((constant): [string, Constant] => [
              constant.name,
              {
                name: constant.name,
                codec: ids[constant.ty]!,
                value: constant.value,
                docs: normalizeDocs(constant.docs),
              },
            ])
          ),
          types: {
            call: ids[pallet.calls!],
            error: ids[pallet.error!],
            event: ids[pallet.event!],
          },
          docs: "",
        },
      ])
    ),
    extrinsic: {
      call: getExtrinsicParameter("call"),
      signature: getExtrinsicParameter("signature"),
      address: getExtrinsicParameter("address"),
      extra: getExtensionsCodec("ty"),
      additional: getExtensionsCodec("additionalSigned"),
    },
  }

  function getExtrinsicParameter(key: "call" | "signature" | "address") {
    if (!metadata.extrinsic.ty) return $.never

    const extrinsicTy = metadata.tys[metadata.extrinsic.ty]
    if (!extrinsicTy) return $.never

    const id = extrinsicTy.params.find((x) => x.name.toLowerCase() === key)?.ty
    if (id === undefined) return $.never

    return ids[id]!
  }
  function getExtensionsCodec(key: "ty" | "additionalSigned") {
    return $.object(
      ...(metadata.extrinsic.signedExtensions.flatMap((ext) => {
        const codec = ids[ext[key]]!
        if (codec === $null) return []
        return [$.field(normalizeIdent(ext.ident), codec)]
      }) as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractTupleMembersVisitor = new $.ShapeVisitor<$.Shape<any>[]>().add(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $.tuple<$.Shape<any>[]>,
  (_codec, ...members) => members
)
