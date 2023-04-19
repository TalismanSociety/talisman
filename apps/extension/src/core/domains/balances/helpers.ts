import { NOM_POOL_SUPPORTED_CHAINS } from "@core/constants"
import {
  NomPoolStakedBalance,
  RequestNomPoolStake,
  ResponseNomPoolStake,
} from "@core/domains/balances/types"
import { chainConnector } from "@core/rpcs/chain-connector"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { Metadata } from "@polkadot/types"
import { RpcStateQuery, RpcStateQueryHelper, StorageHelper } from "@talismn/balances"
import { decodeAnyAddress } from "@talismn/util"

export const getNomPoolStake = async ({
  addresses,
  chainId = "polkadot",
}: RequestNomPoolStake): Promise<ResponseNomPoolStake> => {
  if (!NOM_POOL_SUPPORTED_CHAINS.includes(chainId))
    throw new Error(`Chain ${chainId} not supported for nomination pools`)

  const { registry, metadataRpc } = await getTypeRegistry(chainId)
  registry.setMetadata(new Metadata(registry, metadataRpc))

  const queries = addresses.flatMap(
    (address): RpcStateQuery<[string, NomPoolStakedBalance | null]> | [] => {
      const storageHelper = new StorageHelper(
        registry,
        "nominationPools",
        "poolMembers",
        decodeAnyAddress(address)
      )

      // filter out queries which we failed to encode (e.g. an invalid address was input)
      const stateKey = storageHelper.stateKey
      if (!stateKey) return []

      const decodeResult = (change: string | null): [string, NomPoolStakedBalance | null] => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decoded: any = storageHelper.decode(change)

        // explicit null is required here to ensure the frontend knows that the address has been queried
        const humanResult = decoded?.toHuman?.() ?? null

        return [address, humanResult]
      }

      return { chainId, stateKey, decodeResult }
    }
  )

  const poolMembersResults = Object.fromEntries(
    await new RpcStateQueryHelper(chainConnector, queries).fetch()
  )

  return poolMembersResults
}
