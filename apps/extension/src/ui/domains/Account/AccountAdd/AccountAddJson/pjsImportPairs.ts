import { log } from "@common/log"
import type { PjsKeyringPairJson, PjsKeyringPairsJson } from "@core/types/pjsInterop"
import {
  base64,
  checksumEthereumAddress,
  decodeSs58Address,
  decryptPjsKeystoreAsync,
  encodeAddressEthereum,
  encodeAddressSs58,
} from "@talismn/crypto"
import { assert, hexToU8a, isHexString, u8aConcat, u8aToString } from "@talismn/util"

// values picked from polkadot keyring (decodePair)
const PKCS8_DIVIDER = new Uint8Array([161, 35, 3, 33, 0])
const PKCS8_HEADER = new Uint8Array([48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32])
const SEC_LENGTH = 64
const SEED_LENGTH = 32

/** local replacement for the polkadot-js KeyringPair used by the previous implementation */
export type JsonImportPair = {
  json: PjsKeyringPairJson
  address: string
  type: string
  meta: PjsKeyringPairJson["meta"]
  isLocked: boolean
  secretKey: Uint8Array | null
  publicKey: Uint8Array | null
}

const u8aStartsWith = (bytes: Uint8Array, prefix: Uint8Array, offset = 0) =>
  prefix.every((byte, i) => bytes[offset + i] === byte)

/** pjs keystores may carry `content`/`type` as plain strings (v1/v2) - normalize to arrays */
const normalizeEncoding = (encoding: PjsKeyringPairJson["encoding"]) => ({
  ...encoding,
  content: Array.isArray(encoding.content) ? encoding.content : [encoding.content],
  type: Array.isArray(encoding.type) ? encoding.type : [encoding.type],
})

/** parses a decrypted pkcs8 blob into secret + public keys (same layouts as polkadot-js decodePair) */
const decodePkcs8 = (decrypted: Uint8Array): { secretKey: Uint8Array; publicKey: Uint8Array } => {
  assert(u8aStartsWith(decrypted, PKCS8_HEADER), "Invalid Pkcs8 header found in body")

  // current format (v3): 64-byte secret (sr25519/ed25519) - ecdsa/ethereum and legacy files use a 32-byte secret
  const secOffset = PKCS8_HEADER.length
  let secLength = SEC_LENGTH
  if (!u8aStartsWith(decrypted, PKCS8_DIVIDER, secOffset + secLength)) {
    secLength = SEED_LENGTH
    assert(
      u8aStartsWith(decrypted, PKCS8_DIVIDER, secOffset + secLength),
      "Invalid Pkcs8 divider found in body"
    )
  }

  const secretKey = decrypted.subarray(secOffset, secOffset + secLength)
  const publicKey = decrypted.subarray(secOffset + secLength + PKCS8_DIVIDER.length)

  return { secretKey, publicKey }
}

/**
 * pjs keystores may carry the address as ss58 (any prefix), as an ethereum address, or as raw
 * public key bytes in hex (compressed or not). Mirrors polkadot-js `createPair`: the address
 * field is decoded to payload bytes (`decodeAddress(address, true)`) then re-encoded according
 * to the crypto type (`TYPE_ADDRESS`).
 */
const getPairAddress = (json: PjsKeyringPairJson, cryptoType: string): string => {
  try {
    const payload = isHexString(json.address)
      ? hexToU8a(json.address)
      : decodeSs58Address(json.address, true)[0]

    if (cryptoType === "ethereum")
      return payload.length === 20
        ? checksumEthereumAddress(json.address)
        : encodeAddressEthereum(payload)

    // 33-byte (ecdsa) public keys are blake2-hashed into a 32-byte account id, pjs-style
    return encodeAddressSs58(payload)
  } catch (err) {
    // don't fail the whole file for one undecodable address: keep it as is, the account
    // list will exclude this entry
    log.error("Failed to decode account address from json file", { err, address: json.address })
    return json.address
  }
}

export const createPairFromJson = (json: PjsKeyringPairJson): JsonImportPair => {
  const cryptoType = Array.isArray(json.encoding.content) ? json.encoding.content[1] : "ed25519"

  return {
    json,
    address: getPairAddress(json, cryptoType),
    type: cryptoType,
    meta: json.meta ?? {},
    isLocked: true,
    secretKey: null,
    publicKey: null,
  }
}

// async: scrypt derivation yields to the event loop so the UI keeps rendering (a sync
// derivation freezes the page for the whole run, once per keystore)
export const unlockPair = async (pair: JsonImportPair, password: string) => {
  const { encoded, encoding } = pair.json

  // pjs also supports hex-encoded keystores - normalize to base64 for the decrypt helper
  const encodedB64 = isHexString(encoded) ? base64.encode(hexToU8a(encoded)) : encoded

  const decrypted = await decryptPjsKeystoreAsync(
    { encoded: encodedB64, encoding: normalizeEncoding(encoding) },
    password
  )
  const { secretKey, publicKey } = decodePkcs8(decrypted)

  pair.secretKey = new Uint8Array(secretKey)
  pair.publicKey = new Uint8Array(publicKey)
  pair.isLocked = false
}

/** decrypts a multi-account ("batch-pkcs8") file into its inner account keystores */
export const unlockMultiAccountsJson = async (
  { encoded, encoding }: PjsKeyringPairsJson,
  password: string
): Promise<PjsKeyringPairJson[]> => {
  const data = await decryptPjsKeystoreAsync(
    { encoded, encoding: normalizeEncoding(encoding) },
    password
  )
  return JSON.parse(u8aToString(data)) as PjsKeyringPairJson[]
}

/** same shape as pjs pair.toJson() without password: unencrypted pkcs8, base64-encoded */
export const toUnencryptedPjsJson = (pair: JsonImportPair): PjsKeyringPairJson => {
  assert(pair.secretKey && pair.publicKey, "Account is locked")
  const pkcs8 = u8aConcat(PKCS8_HEADER, pair.secretKey, PKCS8_DIVIDER, pair.publicKey)
  return {
    address: pair.address,
    encoded: base64.encode(pkcs8),
    encoding: {
      content: ["pkcs8", pair.type],
      type: ["none"],
      version: "3",
    },
    meta: pair.meta,
  }
}
