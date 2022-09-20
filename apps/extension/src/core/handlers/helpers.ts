import { passwordStore } from "@core/domains/app"
import type { Address } from "@core/types/base"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { Err, Ok, Result } from "ts-results"

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

const getPairFromAddress = (address: Address) => {
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
  cb: (pair: KeyringPair) => T
): Promise<Result<T, "Unauthorised" | unknown>> => {
  let pair: KeyringPair | null = null
  try {
    try {
      pair = await getUnlockedPairFromAddress(address)
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
