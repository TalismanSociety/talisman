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

export interface FrameMetadata {
  types: Record<string, $.AnyShape>
  paths: Record<string, $.AnyShape>
  pallets: Record<string, Pallet>
  extrinsic: {
    call: $.AnyShape
    signature: $.AnyShape
    address: $.AnyShape
    extra: $.AnyShape
    additional: $.AnyShape
  }
}

export interface Pallet {
  id: number
  name: string
  storagePrefix: string
  storage: Record<string, StorageEntry>
  constants: Record<string, Constant>
  types: {
    call?: $.AnyShape
    event?: $.AnyShape
    error?: $.AnyShape
  }
  docs: string
}

export interface StorageEntry {
  singular: boolean
  name: string
  key: $.AnyShape
  partialKey: $.AnyShape
  value: $.AnyShape
  default?: Uint8Array
  docs: string
}

export interface Constant {
  name: string
  codec: $.AnyShape
  value: Uint8Array
  docs: string
}
