import { readFileSync } from "node:fs"
import path from "node:path"

import type { PjsKeyringPairJson, PjsKeyringPairsJson } from "@core/types/pjsInterop"
import { verify } from "@scure/sr25519"
import { type KeypairCurve, normalizeAddress, signSubstrate } from "@talismn/crypto"
import { hexToU8a } from "@talismn/util"
import { describe, expect, it } from "vitest"

import {
  createPairFromJson,
  toUnencryptedPjsJson,
  unlockMultiAccountsJson,
  unlockPair,
} from "./pjsImportPairs"

/**
 * Import parity against polkadot-js reference outputs, covering every account type the old
 * @polkadot/keyring-based import flow supported.
 *
 * Fixtures were generated ONCE with @polkadot/{keyring,util-crypto,util} 14.0.3 (the last
 * versions shipped in the wallet): for each case, `keyring.addFromSeed(...).toJson(password)`
 * produced the keystore, and the pair's address/publicKey/sign(message) are the references
 * (see tests/fixtures/pjs-import-parity.json).
 *
 * Decrypting one of those keystores is a full scrypt run (N=2^17, about a second), so each
 * fixture also carries an `unencrypted` copy: the same keystore decrypted once, in the
 * `pair.toJson()` no-password layout. The per-curve and per-address checks run on the copies.
 * Two real keystores (current and legacy scrypt params) prove the decryption itself, and that
 * the copies hold the keys polkadot-js wrote.
 */

type SingleFixture = {
  name: string
  curve: KeypairCurve
  json: PjsKeyringPairJson
  unencrypted: PjsKeyringPairJson
  expected: { address: string; publicKey: `0x${string}`; signature: `0x${string}` }
}

type Fixtures = {
  password: string
  message: `0x${string}`
  singles: SingleFixture[]
  batch: {
    json: PjsKeyringPairsJson
    accounts: {
      curve: KeypairCurve
      address: string
      publicKey: `0x${string}`
      signature: `0x${string}`
    }[]
  }
}

const fixturesDir = path.resolve(__dirname, "../../../../../../tests/fixtures")

const FIXTURES = JSON.parse(
  readFileSync(path.join(fixturesDir, "pjs-import-parity.json"), "utf8")
) as Fixtures

const MESSAGE = hexToU8a(FIXTURES.message)

const getSingle = (name: string) => {
  const fixture = FIXTURES.singles.find((single) => single.name === name)
  if (!fixture) throw new Error(`Missing fixture ${name}`)
  return fixture
}

const CURRENT_PARAMS = getSingle("single sr25519 (pjs toJson)")
const LEGACY_PARAMS = getSingle("single sr25519 with legacy scrypt params (N=1<<15)")

const unlockCopy = async (fixture: SingleFixture) => {
  const pair = createPairFromJson(fixture.unencrypted)
  await unlockPair(pair, "")
  return pair
}

const expectSignatureParity = (
  curve: KeypairCurve,
  secretKey: Uint8Array,
  publicKey: Uint8Array,
  pjsSignature: `0x${string}`
) => {
  // proves the decoded secret key is the same key polkadot-js was signing with
  if (curve === "sr25519") {
    // sr25519 signatures are non-deterministic: verify both instead of comparing bytes
    expect(verify(MESSAGE, hexToU8a(pjsSignature), publicKey)).toBe(true)
    expect(verify(MESSAGE, signSubstrate(curve, secretKey, MESSAGE), publicKey)).toBe(true)
  } else {
    // ed25519 + rfc6979 ecdsa/ethereum are deterministic: must be byte-identical
    expect(signSubstrate(curve, secretKey, MESSAGE)).toEqual(hexToU8a(pjsSignature))
  }
}

describe("pjs json import (polkadot-js parity fixtures)", () => {
  for (const fixture of FIXTURES.singles) {
    it(fixture.name, async () => {
      const pair = createPairFromJson(fixture.unencrypted)

      // address must resolve identically to the polkadot-js pair address
      expect(normalizeAddress(pair.address)).toBe(normalizeAddress(fixture.expected.address))
      expect(pair.type).toBe(fixture.curve)

      await unlockPair(pair, "")
      expect(pair.isLocked).toBe(false)
      expect(pair.publicKey).toEqual(hexToU8a(fixture.expected.publicKey))

      expectSignatureParity(
        fixture.curve,
        pair.secretKey!,
        pair.publicKey!,
        fixture.expected.signature
      )

      // the re-encoded unencrypted keystore sent to the backend must decode back to the same keys
      const roundtrip = createPairFromJson(toUnencryptedPjsJson(pair))
      await unlockPair(roundtrip, "")
      expect(roundtrip.secretKey).toEqual(pair.secretKey)
      expect(roundtrip.publicKey).toEqual(pair.publicKey)
      expect(normalizeAddress(roundtrip.address)).toBe(normalizeAddress(fixture.expected.address))
    })
  }

  describe("decrypts the polkadot-js keystore to the keys of its unencrypted copy", () => {
    for (const fixture of [CURRENT_PARAMS, LEGACY_PARAMS]) {
      it(fixture.name, async () => {
        const pair = createPairFromJson(fixture.json)
        expect(pair.isLocked).toBe(true)

        await unlockPair(pair, FIXTURES.password)

        const copy = await unlockCopy(fixture)
        expect(pair.secretKey).toEqual(copy.secretKey)
        expect(pair.publicKey).toEqual(copy.publicKey)
        expect(pair.address).toBe(copy.address)
      })
    }
  })

  it("rejects a wrong password", async () => {
    const pair = createPairFromJson(LEGACY_PARAMS.json)
    await expect(unlockPair(pair, "wrong-password")).rejects.toThrow()
    expect(pair.isLocked).toBe(true)
    expect(pair.secretKey).toBeNull()
  })

  it("batch file rejects a wrong password", async () => {
    await expect(unlockMultiAccountsJson(FIXTURES.batch.json, "wrong-password")).rejects.toThrow()
  })

  it("batch file with all curves", async () => {
    const inner = await unlockMultiAccountsJson(FIXTURES.batch.json, FIXTURES.password)
    expect(inner).toHaveLength(FIXTURES.batch.accounts.length)

    for (const [i, expected] of FIXTURES.batch.accounts.entries()) {
      const pair = createPairFromJson(inner[i])
      expect(normalizeAddress(pair.address)).toBe(normalizeAddress(expected.address))
      expect(pair.type).toBe(expected.curve)
      expect(inner[i].encoding.type).toEqual(["scrypt", "xsalsa20-poly1305"])
    }

    // the inner keystores are encrypted with the batch password
    const [first] = FIXTURES.batch.accounts
    const pair = createPairFromJson(inner[0])
    await unlockPair(pair, FIXTURES.password)
    expect(pair.publicKey).toEqual(hexToU8a(first.publicKey))
    expectSignatureParity(first.curve, pair.secretKey!, pair.publicKey!, first.signature)
  })
})
