import { passwordStore } from "@core/domains/app"
import type { Address } from "@core/types/base"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"

let idCounter = 0

export function getId(): string {
  return `${Date.now()}.${++idCounter}`
}

export function stripUrl(url: string): string {
  assert(
    url &&
      (url.startsWith("http:") ||
        url.startsWith("https:") ||
        url.startsWith("ipfs:") ||
        url.startsWith("ipns:")),
    `Invalid url ${url}, expected to start with http: or https: or ipfs: or ipns:`
  )

  const parts = url.split("/")

  return parts[2]
}

export const getPairFromAddress = (address: Address) => {
  const pair = keyring.getPair(address)
  if (!pair) throw new Error("Unable to find pair")
  return pair
}

export const getUnlockedPairFromAddress = (address: Address) => {
  const pair = getPairFromAddress(address)
  // if the keyring pair is locked, the password is needed
  if (pair.isLocked && !passwordStore.hasPassword) {
    throw new Error("Password needed to unlock the account")
  }
  if (pair.isLocked) pair.decodePkcs8(passwordStore.getPassword())

  return pair
}

export const getPairForAddressSafely = async <T>(
  address: Address,
  cb: (pair: KeyringPair) => T,
  onError?: (error: any) => void
) => {
  let pair: KeyringPair | null = null
  try {
    try {
      pair = getUnlockedPairFromAddress(address)
    } catch (error) {
      passwordStore.clearPassword()
      throw new Error("not logged in")
    }
    return await cb(pair)
  } catch (error) {
    if (onError) onError(error)
    throw error
  } finally {
    if (!!pair && !pair.isLocked) pair.lock()
  }
}

export const isHardwareAccount = (address: Address) => {
  const acc = keyring.getAccount(address)
  return acc?.meta?.isHardware ?? false
}
