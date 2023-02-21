import { NOM_POOL_SUPPORTED_CHAINS } from "@core/constants"
import {
  BalanceLockType,
  LockedBalance,
  NomPoolStakedBalance,
  RequestBalanceLocks,
  RequestNomPoolStake,
  ResponseBalanceLocks,
  ResponseNomPoolStake,
} from "@core/domains/balances/types"
import RpcFactory from "@core/libs/RpcFactory"
import { chainConnector } from "@core/rpcs/chain-connector"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { Metadata } from "@polkadot/types"
import { xxhashAsHex } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import { StorageHelper } from "@talismn/balances"
import { blake2Concat, decodeAnyAddress, hasOwnProperty } from "@talismn/util"

const getLockedType = (input: string, chainId: string): BalanceLockType => {
  if (input.includes("vesting")) return "vesting"
  if (input.includes("calamvst")) return "vesting" // vesting on manta network
  if (input.includes("ormlvest")) return "vesting" // vesting ORML tokens
  if (input.includes("democrac")) return "democracy"
  if (input.includes("phrelect")) return "democracy" // specific to council
  if (input.includes("staking")) return "staking"
  if (input.includes("stkngdel")) return "staking" // staking delegator
  if (input.includes("stkngcol")) return "staking" // staking collator
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

// TODO: Create a new balance module `@talismn/substrate-native-locked`
//       and move this logic into there.
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

export const getNomPoolStake = async ({ addresses, chainId = "polkadot" }: RequestNomPoolStake) => {
  if (!NOM_POOL_SUPPORTED_CHAINS.includes(chainId))
    throw new Error(`Chain ${chainId} not supported for nomination pools`)
  const { registry, metadataRpc } = await getTypeRegistry(chainId)
  registry.setMetadata(new Metadata(registry, metadataRpc))

  const addressQueries = addresses.reduce((result, address) => {
    const storageHelper = new StorageHelper(
      registry,
      "nominationPools",
      "poolMembers",
      decodeAnyAddress(address)
    )
    // filter out queries which we failed to encode (e.g. an invalid address was input)
    if (storageHelper.stateKey == undefined) return result
    result.push({ address, stateKey: storageHelper.stateKey, query: storageHelper })
    return result
  }, [] as { address: string; stateKey: string; query: StorageHelper }[])

  // set up method and params
  const method = "state_queryStorageAt"
  const params = [addressQueries.map((query) => query.stateKey)]

  // query rpc
  const [result] = await chainConnector.send(chainId, method, params)
  // sanity-check that the result is in the format we expect
  if (typeof result !== "object" || result === null) throw new Error("Invalid result")

  if (!hasOwnProperty(result, "changes") || typeof result.changes !== "object")
    throw new Error("Invalid result")

  if (!Array.isArray(result.changes)) throw new Error("Invalid result")

  const poolMembersResults = (result.changes as Array<[unknown, unknown]>).reduce(
    (result, changes: [unknown, unknown]) => {
      const [key, change] = changes
      if (typeof key !== "string") return result
      if (!(typeof change === "string" || change === null)) return result

      const query = addressQueries.find((query) => query.stateKey === key)
      if (query === undefined) return result
      try {
        const queryResult = query.query.decode(change)
        // is a `Codec` from pjs

        const humanResult = queryResult?.toHuman() as NomPoolStakedBalance | undefined
        // explicit null is required here to ensure the frontend knows that the address has been queried
        result[query.address] = humanResult || null
      } catch (error) {
        // noop
      }
      return result
    },
    {} as ResponseNomPoolStake
  )
  return poolMembersResults
}
