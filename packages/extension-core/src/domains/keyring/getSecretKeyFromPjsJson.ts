// Copyright 2017-2022 @polkadot/keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0
import { u8aEq } from "@polkadot/util"
import { jsonDecrypt } from "@polkadot/util-crypto"
import { EncryptedJson } from "@polkadot/util-crypto/types"

// values picked from polkadot keyring
const PKCS8_DIVIDER = new Uint8Array([161, 35, 3, 33, 0])
const PKCS8_HEADER = new Uint8Array([48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32])
const SEC_LENGTH = 64
const SEED_LENGTH = 32
const SEED_OFFSET = PKCS8_HEADER.length

export const getSecretKeyFromPjsJson = (json: EncryptedJson, password: string) => {
  const decrypted = jsonDecrypt(json, password)

  const header = decrypted.subarray(0, PKCS8_HEADER.length)
  if (!u8aEq(header, PKCS8_HEADER)) throw new Error("Invalid Pkcs8 header found in body")

  // current format (v3)
  let privateKey = decrypted.subarray(SEED_OFFSET, SEED_OFFSET + SEC_LENGTH)
  let divOffset = SEED_OFFSET + SEC_LENGTH
  let divider = decrypted.subarray(divOffset, divOffset + PKCS8_DIVIDER.length)

  // legacy formats (v1, v2)
  if (!u8aEq(divider, PKCS8_DIVIDER)) {
    divOffset = SEED_OFFSET + SEED_LENGTH
    privateKey = decrypted.subarray(SEED_OFFSET, divOffset)
    divider = decrypted.subarray(divOffset, divOffset + PKCS8_DIVIDER.length)

    if (!u8aEq(divider, PKCS8_DIVIDER)) throw new Error("Invalid Pkcs8 divider found in body")
  }

  return privateKey
}
