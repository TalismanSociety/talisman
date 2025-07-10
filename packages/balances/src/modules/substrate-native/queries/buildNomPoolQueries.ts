import { decodeScale, ScaleStorageCoder } from "@talismn/scale"
import { Binary } from "polkadot-api"

import { IBalance, MiniMetadata } from "../../../types"
import { buildNetworkStorageCoders } from "../../shared"
import { RpcQueryPack } from "../../shared/rpcQueryPack"
import { MiniMetadataExtra } from "../config"
import { nompoolStashAccountId } from "../util/nompoolAccountId"
import { BaseBalance, NomPoolMemberInfo } from "./buildBaseQueries"

export const buildNomPoolQueries = (
  networkId: string,
  partialBalances: BaseBalance[],
  miniMetadata: MiniMetadata<MiniMetadataExtra>,
): Array<RpcQueryPack<IBalance>> => {
  const networkStorageCoders = getNomPoolCoders(networkId, miniMetadata)

  if (!networkStorageCoders)
    throw new Error(`No network storage coders found for networkId: ${networkId}`)

  return partialBalances.map(({ balance, nomPoolMemberInfo }) => {
    const stateKeys = getNomPoolStateKeys(
      networkStorageCoders,
      nomPoolMemberInfo,
      miniMetadata.extra,
    )

    return {
      stateKeys,
      decodeResult: (changes: (`0x${string}` | null)[]) => {
        if (!nomPoolMemberInfo || !stateKeys.length || changes.includes(null)) return balance

        const accountPoints = nomPoolMemberInfo?.points ?? "0"

        const { poolPoints = "0" } = decodePoolPoints(
          networkStorageCoders.bondedPools!,
          changes[0]!,
          networkId,
        )
        const { poolTotalActiveStake = "0" } = decodePoolStake(
          networkStorageCoders.ledger!,
          changes[1]!,
          networkId,
        )
        const { metadata = "0" } = decodePoolMeta(
          networkStorageCoders.metadata!,
          changes[2]!,
          networkId,
        )

        const amount =
          accountPoints === "0" || poolPoints === "0" || poolTotalActiveStake === "0"
            ? 0n
            : (BigInt(poolTotalActiveStake) * BigInt(accountPoints)) / BigInt(poolPoints)

        const unbondingAmount = nomPoolMemberInfo.unbondingEras.reduce(
          (total, { amount }) => total + BigInt(amount ?? "0"),
          0n,
        )

        return {
          ...balance,
          values: [
            ...(balance.values?.filter(({ source }) => source !== "nompools-staking") ?? []),
            {
              source: "nompools-staking",
              type: "nompool",
              label: "nompools-staking",
              amount: amount.toString(),
              meta: { type: "nompool", poolId: nomPoolMemberInfo.poolId, description: metadata },
            },
            {
              source: "nompools-staking",
              type: "nompool",
              label: "nompools-unbonding",
              amount: unbondingAmount.toString(),
              meta: {
                poolId: nomPoolMemberInfo.poolId,
                description: metadata ?? `Pool ${nomPoolMemberInfo.poolId}`,
                unbonding: true,
              },
            },
          ],
        }
      },
    }
  })
}

const getNomPoolCoders = (networkId: string, miniMetadata: MiniMetadata<MiniMetadataExtra>) => {
  return buildNetworkStorageCoders(networkId, miniMetadata, {
    poolMembers: ["NominationPools", "PoolMembers"],
    bondedPools: ["NominationPools", "BondedPools"],
    ledger: ["Staking", "Ledger"],
    metadata: ["NominationPools", "Metadata"],
  })
}

const decodePoolPoints = (coder: ScaleStorageCoder, value: string, networkId: string) => {
  /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
  type DecodedType = {
    commission?: unknown
    member_counter?: number
    points: bigint
    roles?: unknown
    state?: unknown
  }

  const decoded = decodeScale<DecodedType>(
    coder,
    value,
    `Failed to decode bondedPools on chain ${networkId}`,
  )

  return { poolPoints: decoded?.points.toString() }
}

const decodePoolStake = (coder: ScaleStorageCoder, value: string, networkId: string) => {
  /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
  type DecodedType = {
    active: bigint
    legacy_claimed_rewards?: number[]
    stash?: string
    total?: bigint
    unlocking?: Array<{ value?: bigint; era?: number }>
  }

  const decoded = decodeScale<DecodedType>(
    coder,
    value,
    `Failed to decode ledger on chain ${networkId}`,
  )

  return { poolTotalActiveStake: decoded?.active.toString() }
}

const decodePoolMeta = (coder: ScaleStorageCoder, value: string, networkId: string) => {
  /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
  type DecodedType = Binary

  const decoded = decodeScale<DecodedType>(
    coder,
    value,
    `Failed to decode metadata on chain ${networkId}`,
  )

  const metadata = decoded?.asText()

  return { metadata }
}

const getNomPoolStateKeys = (
  coders: ReturnType<typeof getNomPoolCoders>,
  nomPoolMemberInfo: NomPoolMemberInfo | null,
  extra: MiniMetadataExtra,
): `0x${string}`[] => {
  if (
    !nomPoolMemberInfo ||
    !extra.nominationPoolsPalletId ||
    !coders?.bondedPools ||
    !coders.ledger ||
    !coders.metadata
  )
    return []

  try {
    const poolId = nomPoolMemberInfo.poolId
    const stashAddress = nompoolStashAccountId(extra.nominationPoolsPalletId, poolId)

    const poolPointsStateKey = coders.bondedPools.keys.enc(poolId) as `0x${string}`
    const poolStakeStateKey = coders.ledger.keys.enc(stashAddress) as `0x${string}`
    const poolMetaStateKey = coders.metadata.keys.enc(poolId) as `0x${string}`

    return [poolPointsStateKey, poolStakeStateKey, poolMetaStateKey]
  } catch {
    return []
  }
}
