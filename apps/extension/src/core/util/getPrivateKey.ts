// Copyright 2017-2022 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0
import { KeyringPair } from "@polkadot/keyring/types"
import { u8aEq, u8aToBuffer } from "@polkadot/util"
import { jsonDecrypt } from "@polkadot/util-crypto"

// values picked from polkadot keyring
const PKCS8_DIVIDER = new Uint8Array([161, 35, 3, 33, 0])
const PKCS8_HEADER = new Uint8Array([48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32])
const SEC_LENGTH = 64
const SEED_LENGTH = 32
const SEED_OFFSET = PKCS8_HEADER.length

// built from reverse engineering polkadot keyring
export const getPrivateKey = (pair: KeyringPair, passphrase: string) => {
  if (pair.isLocked) pair.unlock(passphrase)

  const json = pair.toJson(passphrase)
  const decrypted = jsonDecrypt(json, passphrase)

  const header = decrypted.subarray(0, PKCS8_HEADER.length)
  if (!u8aEq(header, PKCS8_HEADER)) throw new Error("Invalid Pkcs8 header found in body")

  let privateKey = decrypted.subarray(SEED_OFFSET, SEED_OFFSET + SEC_LENGTH)
  let divOffset = SEED_OFFSET + SEC_LENGTH
  let divider = decrypted.subarray(divOffset, divOffset + PKCS8_DIVIDER.length)

  if (!u8aEq(divider, PKCS8_DIVIDER)) {
    divOffset = SEED_OFFSET + SEED_LENGTH
    privateKey = decrypted.subarray(SEED_OFFSET, divOffset)
    divider = decrypted.subarray(divOffset, divOffset + PKCS8_DIVIDER.length)

    if (!u8aEq(divider, PKCS8_DIVIDER)) throw new Error("Invalid Pkcs8 divider found in body")
  }

  return u8aToBuffer(privateKey)
}
