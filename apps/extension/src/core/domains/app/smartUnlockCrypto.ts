import { base64 } from "@talismn/crypto"

/* ----------------------------------------------------------------
Encrypts the transformed password with a key derived from the WebAuthn PRF output.
Runs in the background only, so the transformed password never crosses the port.

Mutable buffers holding secret material are zeroed as soon as WebCrypto is done with them,
so they don't linger in the heap until the garbage collector gets to them.
------------------------------------------------------------------*/

const HKDF_INFO = "talisman-smart-unlock-v1"

/** WebAuthn PRF outputs are 32 bytes, accept longer in case a platform ever deviates upwards */
const MIN_PRF_OUTPUT_BYTES = 32

/**
 * Tells a PRF output the caller mangled apart from one the authenticator actually produced.
 *
 * Both make `decryptPassword` throw, but only the latter proves the enrollment can never unlock the
 * wallet again - a decoding failure must not cost the user their enrollment.
 */
export const isUsablePrfOutput = (prfOutput: string): boolean => {
  try {
    return base64.decode(prfOutput).length >= MIN_PRF_OUTPUT_BYTES
  } catch {
    return false
  }
}

/** Derives the AES-GCM key protecting the stored password from a WebAuthn PRF output */
const deriveAesKey = async (prfOutput: string): Promise<CryptoKey> => {
  const prfBytes = base64.decode(prfOutput) as Uint8Array<ArrayBuffer>

  try {
    // importKey copies the key material, the source bytes are ours to clear afterwards
    const keyMaterial = await crypto.subtle.importKey("raw", prfBytes, "HKDF", false, ["deriveKey"])

    return await crypto.subtle.deriveKey(
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
  } finally {
    prfBytes.fill(0)
  }
}

export const encryptPassword = async (password: string, prfOutput: string) => {
  const key = await deriveAesKey(prfOutput)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const passwordBytes = new TextEncoder().encode(password)

  try {
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, passwordBytes)

    return { encryptedPassword: base64.encode(new Uint8Array(encrypted)), iv: base64.encode(iv) }
  } finally {
    passwordBytes.fill(0)
  }
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
  const decryptedBytes = new Uint8Array(decrypted)

  try {
    return new TextDecoder().decode(decryptedBytes)
  } finally {
    decryptedBytes.fill(0)
  }
}
