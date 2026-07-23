import { base64ToBytes, bytesToBase64 } from "@common/base64"

/* ----------------------------------------------------------------
Encrypts the transformed password with a key derived from the WebAuthn PRF output.
Runs in the background only, so the transformed password never crosses the port.
------------------------------------------------------------------*/

const HKDF_SALT = "talisman-biometric-v1"

/** Derives the AES-GCM key protecting the stored password from a WebAuthn PRF output */
const deriveAesKey = async (prfOutput: string): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(prfOutput),
    "HKDF",
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode(HKDF_SALT),
      info: new Uint8Array(0),
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

  return { encryptedPassword: bytesToBase64(encrypted), iv: bytesToBase64(iv) }
}

export const decryptPassword = async (
  encryptedPassword: string,
  iv: string,
  prfOutput: string
): Promise<string> => {
  const key = await deriveAesKey(prfOutput)
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(encryptedPassword)
  )

  return new TextDecoder().decode(decrypted)
}
