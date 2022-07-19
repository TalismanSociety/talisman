import { passwordStore } from "@core/domains/app"
import {
  BalanceLockType,
  LockedBalance,
  RequestBalanceLocks,
  ResponseBalanceLocks,
} from "@core/domains/balances/types"
import { chainStore } from "@core/domains/chains"
import { db } from "@core/libs/db"
import RpcFactory from "@core/libs/RpcFactory"
import type { Address } from "@core/types/base"
import { decodeAnyAddress } from "@core/util"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { xxhashAsHex } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import blake2Concat from "@talisman/util/blake2Concat"

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

export const isHardwareAccount = (address: Address) => {
  const acc = keyring.getAccount(address)
  return acc?.meta?.isHardware ?? false
}

const getLockedType = (input: string): BalanceLockType => {
  if (input.includes("vesting")) return "vesting"
  if (input.includes("democrac")) return "democracy"
  if (input.includes("staking")) return "staking"
  // eslint-disable-next-line no-console
  console.warn(`unknown locked type : ${input}`)
  Sentry.captureMessage(`unknown locked type : ${input}`)
  return "other"
}

// TODO integrate in balance store
export const getBalanceLocks = async ({
  chainId,
  addresses,
}: RequestBalanceLocks): Promise<ResponseBalanceLocks> => {
  const module = xxhashAsHex("Balances", 128).replace(/^0x/, "")
  const method = xxhashAsHex("Locks", 128).replace(/^0x/, "")
  const moduleStorageHash = [module, method].join("")

  const params = [
    addresses
      .map((address) => decodeAnyAddress(address))
      .map((addressBytes) => blake2Concat(addressBytes).replace(/^0x/, ""))
      .map((addressHash) => `0x${moduleStorageHash}${addressHash}`),
  ]

  const [response, registry] = await Promise.all([
    RpcFactory.send(chainId, "state_queryStorageAt", params, true),
    getTypeRegistry(chainId),
  ])

  const result = addresses.reduce<Record<string, LockedBalance[]>>(
    (acc, accountId, accountIndex) => {
      const locks = registry.createType(
        "Vec<PalletBalancesBalanceLock>",
        response[0].changes[accountIndex][1]
      )

      acc[accountId] = locks.map((lock) => ({
        type: getLockedType(lock.id.toUtf8()),
        amount: lock.amount.toString(),
      }))

      return acc
    },
    {}
  )

  return result
}
