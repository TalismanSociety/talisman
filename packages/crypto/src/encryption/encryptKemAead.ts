import { xchacha20poly1305 } from "@noble/ciphers/chacha.js"
import { concatBytes } from "@noble/ciphers/utils.js"
import { MlKem768 } from "mlkem"

/**
 * Encrypts plaintext using ML-KEM-768 + XChaCha20-Poly1305 (KEM-AEAD).
 *
 * Wire format (subtensor pallet-shield v2):
 *   key_hash (16 bytes) || kem_len (2 bytes LE) || kem_ct (variable) || nonce (24 bytes) || aead_ct (variable)
 *
 * @param keyHash   16-byte xxhash128 of the public key (caller must compute, e.g. via Twox128)
 * @param publicKey ML-KEM-768 encapsulation key bytes
 * @param plaintext Data to encrypt (typically a signed extrinsic)
 */
export const encryptKemAead = async (
  keyHash: Uint8Array,
  publicKey: Uint8Array,
  plaintext: Uint8Array
) => {
  if (keyHash.length !== 16) {
    throw new Error(`Expected 16-byte keyHash, got ${keyHash.length}`)
  }

  const kem = new MlKem768()
  const [kemCt, sharedSecret] = await kem.encap(publicKey)

  if (sharedSecret.length !== 32) {
    throw new Error(`Expected 32-byte shared secret, got ${sharedSecret.length}`)
  }

  const nonce = crypto.getRandomValues(new Uint8Array(24))

  const aead = xchacha20poly1305(sharedSecret, nonce)
  const aeadCt = aead.encrypt(plaintext)

  const kemLen = new Uint8Array(2)
  new DataView(kemLen.buffer).setUint16(0, kemCt.length, true)

  return concatBytes(keyHash, kemLen, kemCt, nonce, aeadCt)
}
