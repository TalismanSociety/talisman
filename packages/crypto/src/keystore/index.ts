import { xsalsa20poly1305 } from "@noble/ciphers/salsa.js"
import { scrypt } from "@noble/hashes/scrypt.js"
import { base64 } from "@scure/base"

/**
 * polkadot-js encrypted keystore JSON support (scrypt + xsalsa20-poly1305), byte-compatible
 * with `@polkadot/util-crypto` `jsonEncrypt`/`jsonDecrypt`.
 *
 * Layout of the base64 `encoded` blob:
 *   salt(32) ++ N(u32 LE) ++ p(u32 LE) ++ r(u32 LE) ++ nonce(24) ++ ciphertext
 */

const SALT_LENGTH = 32
const SCRYPT_PARAMS_LENGTH = 12
const NONCE_LENGTH = 24

// polkadot-js scrypt defaults - other values are rejected, same as pjs jsonDecryptData
const SCRYPT_N = 1 << 17
const SCRYPT_P = 1
const SCRYPT_R = 8

export type PjsKeystoreEncoding = {
  content: string[]
  type: string[]
  version: string
}

export type PjsKeystore = {
  encoded: string
  encoding: PjsKeystoreEncoding
}

const readU32LE = (bytes: Uint8Array, offset: number) =>
  bytes[offset] |
  (bytes[offset + 1] << 8) |
  (bytes[offset + 2] << 16) |
  ((bytes[offset + 3] << 24) >>> 0)

const writeU32LE = (value: number) =>
  new Uint8Array([value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff])

const deriveKey = (password: string, salt: Uint8Array): Uint8Array =>
  scrypt(new TextEncoder().encode(password), salt, {
    N: SCRYPT_N,
    p: SCRYPT_P,
    r: SCRYPT_R,
    dkLen: 64,
  }).subarray(0, 32)

/** Decrypts a polkadot-js encrypted keystore (`jsonDecrypt` equivalent) */
export const decryptPjsKeystore = (
  { encoded, encoding }: PjsKeystore,
  password: string
): Uint8Array => {
  if (!encoded) throw new Error("No encrypted data available to decode")

  const bytes = base64.decode(encoded)

  // unencrypted keystores (e.g. in-memory transfers) pass their payload through as-is
  if (!encoding.type.includes("xsalsa20-poly1305")) {
    if (encoding.type.includes("none")) return bytes
    throw new Error(`Unsupported keystore encoding: ${encoding.type.join("/")}`)
  }

  let offset = 0
  let key: Uint8Array
  if (encoding.type.includes("scrypt")) {
    const salt = bytes.subarray(0, SALT_LENGTH)
    const N = readU32LE(bytes, SALT_LENGTH)
    const p = readU32LE(bytes, SALT_LENGTH + 4)
    const r = readU32LE(bytes, SALT_LENGTH + 8)
    // just a safeguard against DoS by malicious params, same as polkadot-js
    if (N !== SCRYPT_N || p !== SCRYPT_P || r !== SCRYPT_R)
      throw new Error("Invalid injected scrypt params found")
    key = deriveKey(password, salt)
    offset = SALT_LENGTH + SCRYPT_PARAMS_LENGTH
  } else {
    // legacy non-scrypt keystores use the raw password padded to 32 bytes
    const padded = new Uint8Array(32)
    padded.set(new TextEncoder().encode(password).subarray(0, 32))
    key = padded
  }

  const nonce = bytes.subarray(offset, offset + NONCE_LENGTH)
  const ciphertext = bytes.subarray(offset + NONCE_LENGTH)

  return xsalsa20poly1305(key, nonce).decrypt(ciphertext)
}

/** Encrypts data as a polkadot-js keystore (`jsonEncrypt` equivalent, always scrypt + v3) */
export const encryptPjsKeystore = (
  data: Uint8Array,
  contentType: string[],
  password: string
): PjsKeystore => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH))

  const key = deriveKey(password, salt)
  const ciphertext = xsalsa20poly1305(key, nonce).encrypt(data)

  const encoded = new Uint8Array(
    SALT_LENGTH + SCRYPT_PARAMS_LENGTH + NONCE_LENGTH + ciphertext.length
  )
  encoded.set(salt, 0)
  encoded.set(writeU32LE(SCRYPT_N), SALT_LENGTH)
  encoded.set(writeU32LE(SCRYPT_P), SALT_LENGTH + 4)
  encoded.set(writeU32LE(SCRYPT_R), SALT_LENGTH + 8)
  encoded.set(nonce, SALT_LENGTH + SCRYPT_PARAMS_LENGTH)
  encoded.set(ciphertext, SALT_LENGTH + SCRYPT_PARAMS_LENGTH + NONCE_LENGTH)

  return {
    encoded: base64.encode(encoded),
    encoding: {
      content: contentType,
      type: ["scrypt", "xsalsa20-poly1305"],
      version: "3",
    },
  }
}
