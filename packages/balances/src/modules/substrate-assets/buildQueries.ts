import { decodeScale, MetadataBuilder } from "@talismn/scale"
import { isNotNil } from "@talismn/util"

import log from "../../log"
import { AmountWithLabel, IBalance, MiniMetadata } from "../../types"
import { BalanceDef, buildNetworkStorageCoders } from "../shared"
import { MaybeStateKey, RpcQueryPack } from "../shared/rpcQueryPack"
import { MODULE_TYPE } from "./config"

export const buildQueries = (
  networkId: string,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[],
  miniMetadata: MiniMetadata,
): Array<RpcQueryPack<IBalance>> => {
  const networkStorageCoders = buildNetworkStorageCoders(networkId, miniMetadata, {
    storage: ["Assets", "Account"],
  })

  return balanceDefs
    .map(({ token, address }): RpcQueryPack<IBalance> | null => {
      const scaleCoder = networkStorageCoders?.storage
      const stateKey =
        tryEncode(scaleCoder, Number(token.assetId), address) ?? // Asset Hub
        tryEncode(scaleCoder, BigInt(token.assetId), address) // Astar

      if (!stateKey) {
        log.warn(
          `Invalid assetId / address in ${networkId} storage query ${token.assetId} / ${address}`,
        )
        return null
      }

      const decodeResult = (changes: MaybeStateKey[]) => {
        /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
        type DecodedType = {
          balance?: bigint

          // On other networks than Astar
          is_frozen?: boolean

          // Astar specific fields
          reason?: { type?: "Sufficient" }
          status?: { type?: "Liquid" } | { type?: "Frozen" }
          extra?: undefined
        }

        const decoded = decodeScale<DecodedType>(
          scaleCoder,
          changes[0],
          `Failed to decode substrate-assets balance on chain ${networkId}`,
        ) ?? {
          balance: 0n,
          is_frozen: false,
          reason: { type: "Sufficient" },
          status: { type: "Liquid" },
          extra: undefined,
        }

        const isFrozen = decoded?.status?.type === "Frozen"
        const amount = (decoded?.balance ?? 0n).toString()

        // due to the following balance calculations, which are made in the `Balance` type:
        //
        // total balance        = (free balance) + (reserved balance)
        // transferable balance = (free balance) - (frozen balance)
        //
        // when `isFrozen` is true we need to set **both** the `free` and `frozen` amounts
        // of this balance to the value we received from the RPC.
        //
        // if we only set the `frozen` amount, then the `total` calculation will be incorrect!
        const free = amount
        const frozen = token.isFrozen || isFrozen ? amount : "0"

        // include balance values even if zero, so that newly-zero values overwrite old values
        const balanceValues: Array<AmountWithLabel<string>> = [
          { type: "free", label: "free", amount: free.toString() },
          { type: "locked", label: "frozen", amount: frozen.toString() },
        ]

        const balance: IBalance = {
          source: "substrate-assets",
          status: "live",
          address,
          networkId,
          tokenId: token.id,
          values: balanceValues,
        }

        return balance
      }

      return {
        stateKeys: [stateKey],
        decodeResult,
      }
    })
    .filter(isNotNil)
}

type ScaleStorageCoder = ReturnType<MetadataBuilder["buildStorage"]>

const tryEncode = (scaleCoder: ScaleStorageCoder | undefined, ...args: unknown[]) => {
  try {
    return scaleCoder?.keys?.enc?.(...args) as MaybeStateKey
  } catch {
    return null
  }
}
