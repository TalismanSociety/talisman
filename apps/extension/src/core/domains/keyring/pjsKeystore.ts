import {
  encryptPjsKeystore,
  getPublicKeyFromSecret,
  type KeypairCurve,
  type PjsKeystore,
} from "@talismn/crypto"
import { u8aConcat } from "@talismn/util"

import { curveToPjsKeypairType } from "./migration-utils"

// values picked from polkadot keyring (encodePair)
const PKCS8_DIVIDER = new Uint8Array([161, 35, 3, 33, 0])
const PKCS8_HEADER = new Uint8Array([48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32])

export type PjsKeyringPairJson = PjsKeystore & {
  address: string
  meta: Record<string, unknown>
}

/**
 * Exports an account as a polkadot-js keystore json, compatible with `KeyringPair.toJson`
 * (pkcs8 layout: header ++ secretKey ++ divider ++ publicKey, encrypted with scrypt + xsalsa20-poly1305).
 */
export const encodePjsKeyringPairJson = (
  account: { address: string; name?: string; curve: KeypairCurve },
  secretKey: Uint8Array,
  exportPw: string
): PjsKeyringPairJson => {
  const publicKey = getPublicKeyFromSecret(secretKey, account.curve)
  const pkcs8 = u8aConcat(PKCS8_HEADER, secretKey, PKCS8_DIVIDER, publicKey)

  const keystore = encryptPjsKeystore(
    pkcs8,
    ["pkcs8", curveToPjsKeypairType(account.curve)],
    exportPw
  )

  return {
    ...keystore,
    address: account.address,
    meta: { name: account.name },
  }
}
