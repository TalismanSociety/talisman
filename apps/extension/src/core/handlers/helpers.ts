import { passwordStore } from "@core/domains/app"
import type { Address } from "@core/types/base"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { Err, Ok, Result } from "ts-results"

export const getPairFromAddress = (address: Address) => {
  const pair = keyring.getPair(address)
  if (!pair) throw new Error("Unable to find pair")
  return pair
}

const getUnlockedPairFromAddress = (address: Address) => {
  const pair = getPairFromAddress(address)
  // if the keyring pair is locked, the password is needed
  if (pair.isLocked) {
    const pw = passwordStore.getPassword()
    assert(pw, "Unauthorised")
    pair.decodePkcs8(pw)
  }

  return pair
}

export const getPairForAddressSafely = async <T>(
  address: Address,
  cb: (pair: KeyringPair) => T | Promise<T>
): Promise<Result<T, "Unauthorised" | unknown>> => {
  let pair: KeyringPair | null = null
  try {
    try {
      pair = hasPrivateKey(address)
        ? getUnlockedPairFromAddress(address)
        : getPairFromAddress(address)
    } catch (error) {
      passwordStore.clearPassword()
      throw error
    }
    return Ok(await cb(pair))
  } catch (error) {
    return new Err(error)
  } finally {
    if (!!pair && !pair.isLocked) pair.lock()
  }
}

export const isHardwareAccount = (address: Address) => {
  const acc = keyring.getAccount(address)
  return acc?.meta?.isHardware ?? false
}

export const isQrAccount = (address: Address) => {
  const acc = keyring.getAccount(address)
  return acc?.meta?.origin === "QR" ?? false
}

export const isWatchedAccount = (address: Address) => {
  const acc = keyring.getAccount(address)
  return acc?.meta?.origin === "WATCHED" ?? false
}

export const hasPrivateKey = (address: Address) => {
  const acc = keyring.getAccount(address)
  if (!acc) return false
  if (acc.meta?.isExternal) return false
  if (acc.meta?.isHardware) return false
  if (["QR", "WATCHED"].includes(acc.meta?.origin as string)) return false
  return true
}
