import { readFileSync } from "node:fs"
import path from "node:path"

import type { PjsKeyringPairJson } from "@core/types/pjsInterop"
import { type KeypairCurve, normalizeAddress } from "@talismn/crypto"
import { hexToU8a } from "@talismn/util"
import {
  createPairFromJson,
  unlockPair,
} from "@ui/domains/Account/AccountAdd/AccountAddJson/pjsImportPairs"
import { describe, expect, it } from "vitest"

import { encodePjsKeyringPairJson } from "./pjsKeystore"

/**
 * Export round-trip: a keystore produced by encodePjsKeyringPairJson must decode back to the
 * exact same keys through the import flow.
 *
 * Reverse parity against REAL polkadot-js was verified once out-of-repo: for each curve,
 * the output of encodePjsKeyringPairJson was fed to @polkadot/keyring 14.0.3
 * `createFromJson(json).decodePkcs8(password)` - identical address and publicKey, produced
 * signatures verify, wrong password rejected. Same for the batch blob via pjs `jsonDecrypt`.
 */

type Fixtures = {
  password: string
  singles: {
    name: string
    curve: KeypairCurve
    json: PjsKeyringPairJson
    expected: { address: string; publicKey: `0x${string}` }
  }[]
}

const fixturesDir = path.resolve(__dirname, "../../../../tests/fixtures")

const FIXTURES = JSON.parse(
  readFileSync(path.join(fixturesDir, "pjs-import-parity.json"), "utf8")
) as Fixtures

const EXPORT_PASSWORD = "talisman-export-roundtrip"

describe("encodePjsKeyringPairJson (export/import round-trip)", () => {
  // one fixture per curve, the plain pjs toJson ones
  const byCurve = FIXTURES.singles.filter(
    (f) => f.name.startsWith("single") && f.name.includes("pjs toJson")
  )

  for (const fixture of byCurve) {
    it(`round-trips a ${fixture.curve} account`, () => {
      // recover the reference secret key from the polkadot-js generated fixture
      const source = createPairFromJson(fixture.json)
      unlockPair(source, FIXTURES.password)

      const exported = encodePjsKeyringPairJson(
        { address: source.address, name: `roundtrip ${fixture.curve}`, curve: fixture.curve },
        source.secretKey!,
        EXPORT_PASSWORD
      )

      expect(exported.encoding).toEqual({
        content: ["pkcs8", fixture.curve],
        type: ["scrypt", "xsalsa20-poly1305"],
        version: "3",
      })

      const imported = createPairFromJson(exported)
      unlockPair(imported, EXPORT_PASSWORD)

      expect(imported.secretKey).toEqual(source.secretKey)
      expect(imported.publicKey).toEqual(hexToU8a(fixture.expected.publicKey))
      expect(normalizeAddress(imported.address)).toBe(normalizeAddress(fixture.expected.address))

      const locked = createPairFromJson(exported)
      expect(() => unlockPair(locked, "wrong-password")).toThrow()
    })
  }
})
