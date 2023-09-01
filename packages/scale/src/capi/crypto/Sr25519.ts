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
import { Sr25519 as WatTheSr25519 } from "wat-the-crypto"

const ctx = new TextEncoder().encode("substrate")

/** For the time being, this should only be used for testing */
export class Sr25519 {
  keypair: WatTheSr25519
  address

  constructor(keypair: { publicKey: Uint8Array; secretKey: Uint8Array }) {
    this.keypair =
      keypair instanceof WatTheSr25519
        ? keypair
        : new WatTheSr25519(keypair.publicKey, keypair.secretKey)
    this.address = { type: "Id" as const, value: this.keypair.publicKey }
  }

  static fromSecret(secret: Uint8Array) {
    return new Sr25519(WatTheSr25519.fromSecret(secret))
  }

  static fromSeed64(seed: Uint8Array) {
    return new Sr25519(WatTheSr25519.fromSeed64(seed))
  }

  get publicKey() {
    return this.keypair.publicKey
  }

  get secretKey() {
    return this.keypair.secretKey
  }

  sign = (msg: Uint8Array) => ({
    type: "Sr25519" as const,
    value: this.keypair.sign(ctx, msg),
  })
}

export const $sr25519 = $.instance(
  Sr25519,
  $.tuple(
    $.object(
      $.field("secretKey", $.sizedUint8Array(64)),
      $.field("publicKey", $.sizedUint8Array(32))
    )
  ),
  (sr25519: Sr25519) => [sr25519.keypair]
)
