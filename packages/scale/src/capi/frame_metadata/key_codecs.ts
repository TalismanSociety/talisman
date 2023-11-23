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

import { twox128 } from "../crypto"

export function $storageKey<I, O>(
  palletName: string,
  entryName: string,
  $key: $.Shape<I, O>
): $.Shape<I, O> {
  const palletHash = twox128.hash(new TextEncoder().encode(palletName))
  const entryHash = twox128.hash(new TextEncoder().encode(entryName))
  return $.createShape({
    metadata: $.metadata("$storageKey", $storageKey, palletName, entryName, $key),
    staticSize: $key.staticSize + 32,
    subEncode(buffer, key) {
      buffer.insertArray(palletHash)
      buffer.insertArray(entryHash)
      $key.subEncode(buffer, key)
    },
    subDecode(buffer) {
      // Ignore initial hashes
      buffer.index += 32
      return $key.subDecode(buffer)
    },
    subAssert(assert) {
      $key.subAssert(assert)
    },
  })
}

export const $emptyKey = $.withMetadata($.metadata("$emptyKey"), $.constant<void>(undefined))

export const $partialEmptyKey = $.createShape<void | null>({
  metadata: $.metadata("$partialEmptyKey"),
  staticSize: 0,
  subEncode() {},
  subDecode() {
    throw new Error("Cannot decode partial key")
  },
  subAssert(assert) {
    if (assert.value != null) {
      throw new $.ShapeAssertError(this, assert.value, `${assert.path} != null`)
    }
  },
})

export function $partialSingleKey<I, O>($inner: $.Shape<I, O>): $.Shape<I | null, O | null> {
  return $.createShape({
    metadata: $.metadata("$partialSingleKey", $partialSingleKey, $inner),
    staticSize: $inner.staticSize,
    subEncode(buffer, key) {
      if (key !== null) $inner.subEncode(buffer, key)
    },
    subDecode() {
      throw new Error("Cannot decode partial key")
    },
    subAssert(assert) {
      if (assert.value === null) return
      $inner.subAssert(assert)
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PartialMultiKey<T extends unknown[]> = T extends [...infer A, any]
  ? T | PartialMultiKey<A>
  : T | null

export function $partialMultiKey<T extends $.AnyShape[]>(
  ...keys: [...T]
): $.Shape<PartialMultiKey<$.OutputTuple<T>>>
export function $partialMultiKey<T>(...codecs: $.Shape<T>[]): $.Shape<T[] | null> {
  return $.createShape({
    metadata: $.metadata("$partialMultiKey", $partialMultiKey, ...codecs),
    staticSize: $.tuple(...codecs).staticSize,
    subEncode(buffer, key) {
      if (!key) return
      for (let i = 0; i < key.length; i++) {
        codecs[i]!.subEncode(buffer, key[i]!)
      }
    },
    subDecode() {
      throw new Error("Cannot decode partial key")
    },
    subAssert(assert) {
      if (assert.value === null) return
      assert.instanceof(this, Array)
      const assertLength = assert.key(this, "length")
      assertLength.typeof(this, "number")
      const length = assertLength.value as number
      $.tuple(...codecs.slice(0, length)).subAssert(assert)
    },
  })
}
