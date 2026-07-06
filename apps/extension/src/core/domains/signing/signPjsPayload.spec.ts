import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import type { KeypairCurve } from "@talismn/crypto"
import { hexToU8a } from "@talismn/util"
import { describe, expect, it } from "vitest"

import type { SignerPayloadJSON } from "../../types/pjsInterop"
import { getSignedExtrinsicHash, signPjsPayload } from "./signPjsPayload"

/**
 * End-to-end signing parity against polkadot-js reference outputs.
 *
 * Fixtures were generated ONCE with @polkadot/{types,keyring,util-crypto} 16.5.6/14.0.3
 * against the committed metadata blobs (see tests/fixtures/pjs-signing-parity.json):
 * for each case, pjs's `ExtrinsicPayload.sign(pair)` + `Extrinsic.addSignature` produced
 * the reference signature, signed transaction and hash. Deterministic curves only
 * (sr25519 is covered by a sign+verify round-trip in Extension.spec and @talismn/crypto).
 */

type ParityFixture = {
  name: string
  chain: "polkadot" | "moonbeam"
  curve: KeypairCurve
  secretKey: `0x${string}`
  payload: SignerPayloadJSON
  signature: `0x${string}`
  signedTransaction: `0x${string}`
  hash: `0x${string}`
  signingInput: `0x${string}`
}

const fixturesDir = path.resolve(__dirname, "../../../../tests/fixtures")

const FIXTURES = JSON.parse(
  readFileSync(path.join(fixturesDir, "pjs-signing-parity.json"), "utf8")
) as ParityFixture[]

const METADATA: Record<ParityFixture["chain"], `0x${string}`> = {
  polkadot: `0x${gunzipSync(readFileSync(path.join(fixturesDir, "polkadot-metadata-v15.scale.gz"))).toString("hex")}`,
  moonbeam: `0x${gunzipSync(readFileSync(path.join(fixturesDir, "moonbeam-metadata-v15.scale.gz"))).toString("hex")}`,
}

describe("signPjsPayload (polkadot-js parity fixtures)", () => {
  for (const fixture of FIXTURES) {
    it(fixture.name, async () => {
      const result = await signPjsPayload(
        METADATA[fixture.chain],
        fixture.payload,
        hexToU8a(fixture.secretKey),
        fixture.curve
      )

      expect(result.signature).toBe(fixture.signature)
      expect(result.signedTransaction).toBe(fixture.signedTransaction)
      expect(getSignedExtrinsicHash(result.signedTransactionBytes)).toBe(fixture.hash)
    })
  }
})
