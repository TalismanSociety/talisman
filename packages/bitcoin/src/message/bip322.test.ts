import {
  deriveKeypair,
  encodeP2trAddress,
  encodeP2wpkhAddress,
  entropyToSeed,
  getBitcoinOrdinalsBasePath,
  getBitcoinPaymentsBasePath,
  getPublicKeyBitcoin,
  mnemonicToEntropy,
  parseWif,
} from "@talismn/crypto"
import { describe, expect, it } from "vitest"

import { signBip322Simple, verifyBip322Simple } from "./bip322"

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

// BIP322 test vector key: L3VF... → bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l
const VECTOR_WIF = "L3VFeEujGtevx9w18HD1fhRbCH67Az2dpCymeRE1SoPK6XQtaN2k"
const VECTOR_ADDRESS = "bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l"

// signatures from the BIP322 spec test vectors (basic-test-vectors.json)
const VECTOR_SIG_HELLO =
  "AkcwRAIgZRfIY3p7/DoVTty6YZbWS71bc5Vct9p9Fia83eRmw2QCICK/ENGfwLtptFluMGs2KsqoNSk89pO7F29zJLUx9a/sASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="
const VECTOR_SIG_EMPTY =
  "AkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI="

describe("bip322 simple", () => {
  it("vector key derives the vector address", () => {
    const secretKey = parseWif(VECTOR_WIF)
    expect(encodeP2wpkhAddress(getPublicKeyBitcoin(secretKey))).toEqual(VECTOR_ADDRESS)
  })

  it("verifies the BIP322 spec signature for Hello World", () => {
    expect(
      verifyBip322Simple({
        address: VECTOR_ADDRESS,
        message: "Hello World",
        signature: VECTOR_SIG_HELLO,
      })
    ).toBe(true)
  })

  it("verifies the BIP322 spec signature for the empty message", () => {
    expect(
      verifyBip322Simple({
        address: VECTOR_ADDRESS,
        message: "",
        signature: VECTOR_SIG_EMPTY,
      })
    ).toBe(true)
  })

  it("rejects the spec signature for a different message", () => {
    expect(
      verifyBip322Simple({
        address: VECTOR_ADDRESS,
        message: "Hello World!",
        signature: VECTOR_SIG_HELLO,
      })
    ).toBe(false)
  })

  it("signs and verifies p2wpkh", () => {
    const secretKey = parseWif(VECTOR_WIF)
    const signature = signBip322Simple({
      address: VECTOR_ADDRESS,
      message: "Talisman",
      secretKey,
    })
    expect(verifyBip322Simple({ address: VECTOR_ADDRESS, message: "Talisman", signature })).toBe(
      true
    )
    expect(
      verifyBip322Simple({ address: VECTOR_ADDRESS, message: "not Talisman", signature })
    ).toBe(false)
  })

  it("signs and verifies p2tr", async () => {
    const seed = await entropyToSeed(mnemonicToEntropy(MNEMONIC), "bitcoin-ecdsa")
    const { secretKey, publicKey } = deriveKeypair(
      seed,
      `${getBitcoinOrdinalsBasePath(0)}/0/0`,
      "bitcoin-ecdsa"
    )
    const address = encodeP2trAddress(publicKey)

    const signature = signBip322Simple({ address, message: "Talisman taproot", secretKey })
    expect(verifyBip322Simple({ address, message: "Talisman taproot", signature })).toBe(true)
    expect(verifyBip322Simple({ address, message: "wrong", signature })).toBe(false)
  })

  it("rejects a signature from the wrong key", async () => {
    const seed = await entropyToSeed(mnemonicToEntropy(MNEMONIC), "bitcoin-ecdsa")
    const wrongKey = deriveKeypair(seed, `${getBitcoinPaymentsBasePath(0)}/0/0`, "bitcoin-ecdsa")

    // signing with a key that doesn't match the address must fail outright
    expect(() =>
      signBip322Simple({
        address: VECTOR_ADDRESS,
        message: "Talisman",
        secretKey: wrongKey.secretKey,
      })
    ).toThrow()
  })
})
