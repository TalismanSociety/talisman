import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { Err, Ok, Result } from "ts-results"

import { hasPrivateKey } from "../domains/accounts/helpers"
import { passwordStore } from "../domains/app/store.password"
import type { Address } from "../types/base"

export const getPairFromAddress = (address: Address) => {
  const pair = keyring.getPair(address)
  if (!pair) throw new Error("Unable to find pair")
  return pair
}

const getUnlockedPairFromAddress = async (address: Address) => {
  const pair = getPairFromAddress(address)
  // if the keyring pair is locked, the password is needed
  if (pair.isLocked) {
    const pw = await passwordStore.getPassword()
    assert(pw, "Unauthorised")
    pair.decodePkcs8(pw)
  }

  return pair
}

export const getPairForAddressSafely = async <T>(
  address: Address,
  cb: (pair: KeyringPair) => T | Promise<T>
): Promise<Result<T, "Unauthorised" | Error>> => {
  let pair: KeyringPair | null = null
  try {
    try {
      pair = hasPrivateKey(address)
        ? await getUnlockedPairFromAddress(address)
        : getPairFromAddress(address)
    } catch (error) {
      passwordStore.clearPassword()
      throw error
    }
    return Ok(await cb(pair))
  } catch (error) {
    return new Err(error as Error)
  } finally {
    if (!!pair && !pair.isLocked) pair.lock()
  }
}
