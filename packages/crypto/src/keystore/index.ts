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
const POLY1305_TAG_LENGTH = 16

const ENCRYPTED_ENCODING_TYPES = ["scrypt", "xsalsa20-poly1305"]

// scrypt param combos accepted by polkadot-js (scryptFromU8a ALLOWED_PARAMS) - includes
// historical defaults (e.g. N=1<<15) so old exports remain importable; anything else is rejected
const ALLOWED_SCRYPT_PARAMS = [
  { N: 1 << 13, p: 10, r: 8 },
  { N: 1 << 14, p: 5, r: 8 },
  { N: 1 << 15, p: 3, r: 8 },
  { N: 1 << 15, p: 1, r: 8 },
  { N: 1 << 16, p: 2, r: 8 },
  { N: 1 << 17, p: 1, r: 8 },
]

// current polkadot-js scrypt defaults, used for encryption
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

const deriveKey = (
  password: string,
  salt: Uint8Array,
  params: { N: number; p: number; r: number }
): Uint8Array => {
  const passwordBytes = new TextEncoder().encode(password)
  const derived = scrypt(passwordBytes, salt, { ...params, dkLen: 64 })
  const key = derived.slice(0, 32)
  derived.fill(0)
  passwordBytes.fill(0)
  return key
}

/**
 * Decrypts a polkadot-js encrypted keystore (`jsonDecrypt` equivalent). Only
 * `xsalsa20-poly1305` keystores, with or without `scrypt`, are accepted, so a successful
 * decrypt proves the password. An unencrypted (`none`) keystore throws: read it with
 * {@link decodeUnencryptedPjsKeystore}.
 */
export const decryptPjsKeystore = (
  { encoded, encoding }: PjsKeystore,
  password: string
): Uint8Array => {
  if (!encoded) throw new Error("No encrypted data available to decode")

  if (encoding.type.includes("none")) throw new Error("Keystore is not encrypted")
  if (
    !encoding.type.includes("xsalsa20-poly1305") ||
    encoding.type.some((type) => !ENCRYPTED_ENCODING_TYPES.includes(type))
  )
    throw new Error(`Unsupported keystore encoding: ${encoding.type.join("/")}`)

  const bytes = base64.decode(encoded)

  const isScrypt = encoding.type.includes("scrypt")
  const offset = isScrypt ? SALT_LENGTH + SCRYPT_PARAMS_LENGTH : 0
  if (bytes.length < offset + NONCE_LENGTH + POLY1305_TAG_LENGTH)
    throw new Error("Keystore data is too short")

  let key: Uint8Array
  if (isScrypt) {
    const salt = bytes.subarray(0, SALT_LENGTH)
    const N = readU32LE(bytes, SALT_LENGTH)
    const p = readU32LE(bytes, SALT_LENGTH + 4)
    const r = readU32LE(bytes, SALT_LENGTH + 8)
    // just a safeguard against DoS by malicious params, same as polkadot-js
    if (!ALLOWED_SCRYPT_PARAMS.some((preset) => preset.N === N && preset.p === p && preset.r === r))
      throw new Error("Invalid injected scrypt params found")
    key = deriveKey(password, salt, { N, p, r })
  } else {
    // legacy non-scrypt keystores use the raw password padded to 32 bytes
    const passwordBytes = new TextEncoder().encode(password)
    key = new Uint8Array(32)
    key.set(passwordBytes.subarray(0, 32))
    passwordBytes.fill(0)
  }

  try {
    const nonce = bytes.subarray(offset, offset + NONCE_LENGTH)
    const ciphertext = bytes.subarray(offset + NONCE_LENGTH)
    return xsalsa20poly1305(key, nonce).decrypt(ciphertext)
  } finally {
    key.fill(0)
  }
}

/**
 * Returns the payload of an unencrypted (`none`) polkadot-js keystore, such as the output of
 * pjs `pair.toJson()` without a password. Throws for any other encoding.
 *
 * The payload carries no authentication: never use this to check a password.
 */
export const decodeUnencryptedPjsKeystore = ({ encoded, encoding }: PjsKeystore): Uint8Array => {
  if (!encoded) throw new Error("No data available to decode")
  if (encoding.type.length !== 1 || encoding.type[0] !== "none")
    throw new Error(`Keystore is encrypted: ${encoding.type.join("/")}`)
  return base64.decode(encoded)
}

/** Encrypts data as a polkadot-js keystore (`jsonEncrypt` equivalent, always scrypt + v3) */
export const encryptPjsKeystore = (
  data: Uint8Array,
  contentType: string[],
  password: string
): PjsKeystore => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH))

  const key = deriveKey(password, salt, { N: SCRYPT_N, p: SCRYPT_P, r: SCRYPT_R })
  const ciphertext = xsalsa20poly1305(key, nonce).encrypt(data)
  key.fill(0)

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
