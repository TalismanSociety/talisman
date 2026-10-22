import { readFileSync } from "node:fs"
import path from "node:path"

import type { PjsKeyringPairJson } from "@core/types/pjsInterop"
import { base64, type KeypairCurve, normalizeAddress } from "@talismn/crypto"
import { hexToU8a } from "@talismn/util"
import {
  createPairFromJson,
  unlockPair,
} from "@ui/domains/Account/AccountAdd/AccountAddJson/pjsImportPairs"
import { describe, expect, it, vi } from "vitest"

import { encodePjsKeyringPairJson } from "./pjsKeystore"

// scrypt at the exported params (N=2^17) takes about a second per run and the keystore layout
// is what this file proves, so keys are derived at N=2^10 instead. The setup files load
// @talismn/crypto before this mock registers, hence the module cache reset.
vi.hoisted(() => vi.resetModules())
vi.mock("@noble/hashes/scrypt.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@noble/hashes/scrypt.js")>()
  return {
    ...actual,
    scrypt: ((password, salt, opts) =>
      actual.scrypt(password, salt, { ...opts, N: 1 << 10 })) satisfies typeof actual.scrypt,
  }
})

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
    unencrypted: PjsKeyringPairJson
    expected: { address: string; publicKey: `0x${string}` }
  }[]
}

const fixturesDir = path.resolve(__dirname, "../../../../tests/fixtures")

const FIXTURES = JSON.parse(
  readFileSync(path.join(fixturesDir, "pjs-import-parity.json"), "utf8")
) as Fixtures

const EXPORT_PASSWORD = "talisman-export-roundtrip"

// salt(32) ++ N(u32 LE) ++ p(u32 LE) ++ r(u32 LE) ++ nonce(24) ++ ciphertext
const readScryptParams = (encoded: string) => {
  const view = new DataView(base64.decode(encoded).buffer)
  return { N: view.getUint32(32, true), p: view.getUint32(36, true), r: view.getUint32(40, true) }
}

const unlockSource = async (fixture: Fixtures["singles"][number]) => {
  const source = createPairFromJson(fixture.unencrypted)
  await unlockPair(source, "")
  return source
}

const exportFixture = async (fixture: Fixtures["singles"][number]) => {
  const source = await unlockSource(fixture)
  const exported = encodePjsKeyringPairJson(
    { address: source.address, name: `roundtrip ${fixture.curve}`, curve: fixture.curve },
    source.secretKey!,
    EXPORT_PASSWORD
  )
  return { source, exported }
}

describe("encodePjsKeyringPairJson (export/import round-trip)", () => {
  // one fixture per curve, the plain pjs toJson ones
  const byCurve = FIXTURES.singles.filter(
    (f) => f.name.startsWith("single") && f.name.includes("pjs toJson")
  )

  for (const fixture of byCurve) {
    it(`round-trips a ${fixture.curve} account`, async () => {
      const { source, exported } = await exportFixture(fixture)

      expect(exported.encoding).toEqual({
        content: ["pkcs8", fixture.curve],
        type: ["scrypt", "xsalsa20-poly1305"],
        version: "3",
      })
      // the current polkadot-js defaults, which its import allow-list accepts
      expect(readScryptParams(exported.encoded)).toEqual({ N: 1 << 17, p: 1, r: 8 })

      const imported = createPairFromJson(exported)
      await unlockPair(imported, EXPORT_PASSWORD)

      expect(imported.secretKey).toEqual(source.secretKey)
      expect(imported.publicKey).toEqual(hexToU8a(fixture.expected.publicKey))
      expect(normalizeAddress(imported.address)).toBe(normalizeAddress(fixture.expected.address))
    })
  }

  it("rejects a wrong password", async () => {
    const { exported } = await exportFixture(byCurve[0])

    const locked = createPairFromJson(exported)
    await expect(unlockPair(locked, "wrong-password")).rejects.toThrow()
    expect(locked.isLocked).toBe(true)
  })
})
