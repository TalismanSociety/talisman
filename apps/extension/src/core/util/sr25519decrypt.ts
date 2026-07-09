// Code in this file is heavily derived from the approach outlined in this PR:
// https://github.com/polkadot-js/common/pull/1331

import { xsalsa20poly1305 } from "@noble/ciphers/salsa.js"
import type { HexString } from "@talismn/util"
import { assert, u8aCmp, u8aToU8a } from "@talismn/util"

import {
  buildSR25519EncryptionKey,
  type Keypair,
  keyDerivationSaltSize,
  macData,
  nonceSize,
} from "./sr25519encrypt"

const publicKeySize = 32
const macValueSize = 32

interface sr25519EncryptedMessage {
  ephemeralPublicKey: Uint8Array
  keyDerivationSalt: Uint8Array
  macValue: Uint8Array
  nonce: Uint8Array
  sealed: Uint8Array
}

/**
 * @name sr25519Decrypt
 * @description Returns decrypted message of `encryptedMessage`, using the supplied pair
 * @deprecated Experiment for the now-defunct SUMI chain, not part of the injected-web3 spec.
 * Scheduled for removal — do not use in new code.
 */
export function sr25519Decrypt(
  encryptedMessage: HexString | Uint8Array | string,
  { secretKey }: Partial<Keypair>
): Uint8Array | null {
  const { ephemeralPublicKey, keyDerivationSalt, macValue, nonce, sealed } =
    sr25519DecapsulateEncryptedMessage(u8aToU8a(encryptedMessage))
  const { encryptionKey, macKey } = buildSR25519EncryptionKey(
    ephemeralPublicKey,
    u8aToU8a(secretKey),
    ephemeralPublicKey,
    keyDerivationSalt
  )
  const decryptedMacValue = macData(nonce, sealed, ephemeralPublicKey, macKey)

  assert(u8aCmp(decryptedMacValue, macValue) === 0, "Mac values don't match")

  try {
    return xsalsa20poly1305(encryptionKey, nonce).decrypt(sealed)
  } catch {
    // same behavior as the previous naclDecrypt implementation
    return null
  }
}

/**
 * @name sr25519DecapsulateEncryptedMessage
 * @description Split raw encrypted message
 */
function sr25519DecapsulateEncryptedMessage(encryptedMessage: Uint8Array): sr25519EncryptedMessage {
  assert(
    encryptedMessage.byteLength > nonceSize + keyDerivationSaltSize + publicKeySize + macValueSize,
    "Wrong encrypted message length"
  )

  return {
    ephemeralPublicKey: encryptedMessage.slice(
      nonceSize + keyDerivationSaltSize,
      nonceSize + keyDerivationSaltSize + publicKeySize
    ),
    keyDerivationSalt: encryptedMessage.slice(nonceSize, nonceSize + keyDerivationSaltSize),
    macValue: encryptedMessage.slice(
      nonceSize + keyDerivationSaltSize + publicKeySize,
      nonceSize + keyDerivationSaltSize + publicKeySize + macValueSize
    ),
    nonce: encryptedMessage.slice(0, nonceSize),
    sealed: encryptedMessage.slice(
      nonceSize + keyDerivationSaltSize + publicKeySize + macValueSize
    ),
  }
}
