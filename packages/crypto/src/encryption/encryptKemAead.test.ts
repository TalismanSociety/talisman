import { xchacha20poly1305 } from "@noble/ciphers/chacha.js"
import { MlKem768 } from "mlkem"

import { encryptKemAead } from "./encryptKemAead"

describe("encryptKemAead", () => {
  it("produces v2 wire format: keyHash(16) || kemLen(2) || kemCt || nonce(24) || aeadCt", async () => {
    const kem = new MlKem768()
    const [encKey, decKey] = await kem.generateKeyPair()

    const keyHash = new Uint8Array(16).fill(0xab)
    const plaintext = new Uint8Array([1, 2, 3, 4, 5])

    const ciphertext = await encryptKemAead(keyHash, encKey, plaintext)

    // parse the wire format
    expect(ciphertext.length).toBeGreaterThan(16 + 2 + 24)

    // 1. key_hash (16 bytes)
    const parsedKeyHash = ciphertext.slice(0, 16)
    expect(parsedKeyHash).toEqual(keyHash)

    // 2. kem_len (2 bytes LE)
    const kemLen = new DataView(ciphertext.buffer, ciphertext.byteOffset + 16, 2).getUint16(0, true)
    expect(kemLen).toBeGreaterThan(0)

    // 3. kem_ct (kemLen bytes)
    const kemCt = ciphertext.slice(18, 18 + kemLen)
    expect(kemCt.length).toBe(kemLen)

    // 4. nonce (24 bytes)
    const nonce = ciphertext.slice(18 + kemLen, 18 + kemLen + 24)
    expect(nonce.length).toBe(24)

    // 5. aead_ct (remaining bytes)
    const aeadCt = ciphertext.slice(18 + kemLen + 24)
    expect(aeadCt.length).toBeGreaterThan(0)

    // verify round-trip: decapsulate KEM, then decrypt AEAD
    const sharedSecret = await kem.decap(kemCt, decKey)
    const aead = xchacha20poly1305(sharedSecret, nonce)
    const decrypted = aead.decrypt(aeadCt)
    expect(decrypted).toEqual(plaintext)
  })

  it("rejects invalid keyHash length", async () => {
    const kem = new MlKem768()
    const [encKey] = await kem.generateKeyPair()

    const badKeyHash = new Uint8Array(10) // wrong length
    await expect(encryptKemAead(badKeyHash, encKey, new Uint8Array([1]))).rejects.toThrow(
      "Expected 16-byte keyHash"
    )
  })

  it("produces different ciphertexts for the same plaintext (random nonce)", async () => {
    const kem = new MlKem768()
    const [encKey] = await kem.generateKeyPair()

    const keyHash = new Uint8Array(16).fill(0x01)
    const plaintext = new Uint8Array([10, 20, 30])

    const ct1 = await encryptKemAead(keyHash, encKey, plaintext)
    const ct2 = await encryptKemAead(keyHash, encKey, plaintext)

    // ciphertexts should differ due to random nonce and KEM randomness
    expect(ct1).not.toEqual(ct2)
  })
})
