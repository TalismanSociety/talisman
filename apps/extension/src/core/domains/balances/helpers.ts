import RpcFactory from "@core/libs/RpcFactory"
import { decodeAnyAddress } from "@core/util/decodeAnyAddress"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { xxhashAsHex } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import blake2Concat from "@talisman/util/blake2Concat"

import { BalanceLockType, LockedBalance, RequestBalanceLocks, ResponseBalanceLocks } from "./types"

const getLockedType = (input: string, chainId: string): BalanceLockType => {
  if (input.includes("vesting")) return "vesting"
  if (input.includes("calamvst")) return "vesting" // vesting on manta network
  if (input.includes("ormlvest")) return "vesting" // vesting ORML tokens
  if (input.includes("democrac")) return "democracy"
  if (input.includes("phrelect")) return "democracy" // specific to council
  if (input.includes("staking")) return "staking"
  if (input.includes("stkngdel")) return "staking" // ex: MOVR staking
  if (input.includes("kiltpstk")) return "staking" // Kilt specific staking
  if (input.includes("dapstake")) return "dapp-staking" // Astar specific

  // ignore technical or undocumented lock types
  if (input.includes("pdexlock")) return "other"
  if (input.includes("phala/sp")) return "other"

  // eslint-disable-next-line no-console
  console.warn(`unknown locked type : ${input}`)
  Sentry.captureMessage(`unknown locked type : ${input}`, { tags: { chainId } })
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

  const [response, { registry }] = await Promise.all([
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
        type: getLockedType(lock.id.toUtf8(), chainId),
        amount: lock.amount.toString(),
      }))

      return acc
    },
    {}
  )

  return result
}
