// Code in this file is heavily derived from the approach outlined in this PR:
// https://github.com/polkadot-js/common/pull/1331

import { assert, u8aConcat, u8aToU8a } from "@polkadot/util"
import {
  hmacSha256AsU8a,
  mnemonicGenerate,
  mnemonicToMiniSecret,
  naclEncrypt,
  pbkdf2Encode,
  randomAsU8a,
  sr25519Agreement,
  sr25519PairFromSeed,
} from "@polkadot/util-crypto"
import type { Keypair } from "@polkadot/util-crypto/types"
import type { HexString } from "@polkadot/util/types"

const encryptionKeySize = 32
const macKeySize = 32
const derivationKeyRounds = 2048

export const keyDerivationSaltSize = 32
export const nonceSize = 24

/**
 * @name sr25519Encrypt
 * @description Returns encrypted message of `message`, using the supplied pair
 */
export function sr25519Encrypt(
  message: HexString | Uint8Array | string,
  receiverPublicKey: Uint8Array,
  senderKeyPair?: Keypair
): Uint8Array {
  const messageKeyPair = senderKeyPair || generateEphemeralKeypair()
  const { encryptionKey, keyDerivationSalt, macKey } = generateEncryptionKey(
    messageKeyPair,
    receiverPublicKey
  )
  const { encrypted, nonce } = naclEncrypt(u8aToU8a(message), encryptionKey, randomAsU8a(nonceSize))
  const macValue = macData(nonce, encrypted, messageKeyPair.publicKey, macKey)

  return u8aConcat(nonce, keyDerivationSalt, messageKeyPair.publicKey, macValue, encrypted)
}

function generateEphemeralKeypair(): Keypair {
  return sr25519PairFromSeed(mnemonicToMiniSecret(mnemonicGenerate()))
}

function generateEncryptionKey(senderKeyPair: Keypair, receiverPublicKey: Uint8Array) {
  const { encryptionKey, keyDerivationSalt, macKey } = buildSR25519EncryptionKey(
    receiverPublicKey,
    senderKeyPair.secretKey,
    senderKeyPair.publicKey
  )

  return {
    encryptionKey,
    keyDerivationSalt,
    macKey,
  }
}

export function buildSR25519EncryptionKey(
  publicKey: Uint8Array,
  secretKey: Uint8Array,
  encryptedMessagePairPublicKey: Uint8Array,
  salt: Uint8Array = randomAsU8a(keyDerivationSaltSize)
) {
  const agreementKey = sr25519Agreement(secretKey, publicKey)
  const masterSecret = u8aConcat(encryptedMessagePairPublicKey, agreementKey)

  return deriveKey(masterSecret, salt)
}

function deriveKey(masterSecret: Uint8Array, salt: Uint8Array) {
  const { password } = pbkdf2Encode(masterSecret, salt, derivationKeyRounds)

  assert(password.byteLength >= macKeySize + encryptionKeySize, "Wrong derived key length")

  return {
    encryptionKey: password.slice(macKeySize, macKeySize + encryptionKeySize),
    keyDerivationSalt: salt,
    macKey: password.slice(0, macKeySize),
  }
}

export function macData(
  nonce: Uint8Array,
  encryptedMessage: Uint8Array,
  encryptedMessagePairPublicKey: Uint8Array,
  macKey: Uint8Array
): Uint8Array {
  return hmacSha256AsU8a(macKey, u8aConcat(nonce, encryptedMessagePairPublicKey, encryptedMessage))
}
