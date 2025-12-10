import { xchacha20poly1305 } from "@noble/ciphers/chacha.js"
import { concatBytes } from "@noble/ciphers/utils.js"
import { MlKem768 } from "mlkem"

export const encryptKemAead = async (publicKey: Uint8Array, plaintext: Uint8Array) => {
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

  return concatBytes(kemLen, kemCt, nonce, aeadCt)
}
