import { base64 } from "@talismn/crypto"

/* ----------------------------------------------------------------
Encrypts the transformed password with a key derived from the WebAuthn PRF output.
Runs in the background only, so the transformed password never crosses the port.
------------------------------------------------------------------*/

const HKDF_INFO = "talisman-biometric-v1"

/** Derives the AES-GCM key protecting the stored password from a WebAuthn PRF output */
const deriveAesKey = async (prfOutput: string): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    base64.decode(prfOutput) as Uint8Array<ArrayBuffer>,
    "HKDF",
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      // the PRF output is already high entropy, the context string belongs in info
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(HKDF_INFO),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export const encryptPassword = async (password: string, prfOutput: string) => {
  const key = await deriveAesKey(prfOutput)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password)
  )

  return { encryptedPassword: base64.encode(new Uint8Array(encrypted)), iv: base64.encode(iv) }
}

export const decryptPassword = async (
  encryptedPassword: string,
  iv: string,
  prfOutput: string
): Promise<string> => {
  const key = await deriveAesKey(prfOutput)
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64.decode(iv) as Uint8Array<ArrayBuffer> },
    key,
    base64.decode(encryptedPassword) as Uint8Array<ArrayBuffer>
  )

  return new TextDecoder().decode(decrypted)
}
