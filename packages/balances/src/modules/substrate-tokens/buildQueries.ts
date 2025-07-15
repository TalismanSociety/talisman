import { decodeScale, papiParse } from "@talismn/scale"
import { isNotNil } from "@talismn/util"

import log from "../../log"
import { AmountWithLabel, IBalance, MiniMetadata } from "../../types"
import { buildNetworkStorageCoders } from "../shared"
import { MaybeStateKey, RpcQueryPack } from "../shared/rpcQueryPack"
import { BalanceDef } from "../shared/types"
import { MiniMetadataExtra, MODULE_TYPE } from "./config"

export const buildQueries = (
  networkId: string,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[],
  miniMetadata: MiniMetadata<MiniMetadataExtra>,
): Array<RpcQueryPack<IBalance>> => {
  const networkStorageCoders = buildNetworkStorageCoders(networkId, miniMetadata, {
    storage: [miniMetadata.extra.palletId, "Accounts"],
  })

  return balanceDefs
    .map(({ token, address }): RpcQueryPack<IBalance> | null => {
      const scaleCoder = networkStorageCoders?.storage

      const getStateKey = (onChainId: string | number) => {
        try {
          return scaleCoder!.keys.enc(address, papiParse(onChainId)) as MaybeStateKey
        } catch {
          return null
        }
      }

      const stateKey = getStateKey(token.onChainId)

      if (!stateKey) {
        log.warn(
          `Invalid assetId / address in ${networkId} storage query ${token.onChainId} / ${address}`,
        )
        return null
      }

      const decodeResult = (changes: MaybeStateKey[]) => {
        /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
        type DecodedType = {
          free?: bigint
          reserved?: bigint
          frozen?: bigint
        }

        const decoded = decodeScale<DecodedType>(
          scaleCoder,
          changes[0],
          `Failed to decode substrate-tokens balance on chain ${networkId}`,
        ) ?? { free: 0n, reserved: 0n, frozen: 0n }

        const free = (decoded?.free ?? 0n).toString()
        const reserved = (decoded?.reserved ?? 0n).toString()
        const frozen = (decoded?.frozen ?? 0n).toString()

        const balanceValues: Array<AmountWithLabel<string>> = [
          { type: "free", label: "free", amount: free.toString() },
          { type: "reserved", label: "reserved", amount: reserved.toString() },
          { type: "locked", label: "frozen", amount: frozen.toString() },
        ]

        return {
          source: "substrate-tokens",
          status: "live",
          address,
          networkId,
          tokenId: token.id,
          values: balanceValues,
        } as IBalance
      }

      return {
        stateKeys: [stateKey],
        decodeResult,
      }
    })
    .filter(isNotNil)
}
