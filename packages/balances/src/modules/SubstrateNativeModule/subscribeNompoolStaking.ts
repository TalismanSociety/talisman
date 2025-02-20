import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider } from "@talismn/chaindata-provider"
import { Binary, decodeScale, encodeStateKey } from "@talismn/scale"
import { isEthereumAddress } from "@talismn/util"
import { combineLatest, map, scan, share, switchAll } from "rxjs"

import type { SubNativeModule } from "./index"
import log from "../../log"
import { db as balancesDb } from "../../TalismanBalancesDatabase"
import { AddressesByToken, SubscriptionCallback } from "../../types"
import {
  buildStorageCoders,
  findChainMeta,
  getUniqueChainIds,
  RpcStateQuery,
  RpcStateQueryHelper,
} from "../util"
import { SubNativeBalance, SubNativeToken } from "./types"
import { asObservable } from "./util/asObservable"
import { nompoolStashAccountId } from "./util/nompoolAccountId"

export async function subscribeNompoolStaking(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<SubNativeToken>,
  callback: SubscriptionCallback<SubNativeBalance[]>,
) {
  const allChains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()
  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ]),
  )
  const nomPoolTokenIds = Object.entries(tokens)
    .filter(([, token]) => {
      // ignore non-native tokens
      if (token.type !== "substrate-native") return false
      // ignore tokens on chains with no nompools pallet
      const [chainMeta] = findChainMeta<typeof SubNativeModule>(
        miniMetadatas,
        "substrate-native",
        allChains[token.chain.id],
      )
      return typeof chainMeta?.nominationPoolsPalletId === "string"
    })
    .map(([tokenId]) => tokenId)

  // staking can only be done by the native token on chains with the staking pallet
  const addressesByNomPoolToken = Object.fromEntries(
    Object.entries(addressesByToken)
      // remove ethereum addresses
      .map(([tokenId, addresses]): [string, string[]] => [
        tokenId,
        addresses.filter((address) => !isEthereumAddress(address)),
      ])
      // remove tokens which aren't nom pool tokens
      .filter(([tokenId]) => nomPoolTokenIds.includes(tokenId)),
  )

  const uniqueChainIds = getUniqueChainIds(addressesByNomPoolToken, tokens)
  const chains = Object.fromEntries(
    Object.entries(allChains).filter(([chainId]) => uniqueChainIds.includes(chainId)),
  )
  const chainStorageCoders = buildStorageCoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-native",
    coders: {
      poolMembers: ["NominationPools", "PoolMembers"],
      bondedPools: ["NominationPools", "BondedPools"],
      ledger: ["Staking", "Ledger"],
      metadata: ["NominationPools", "Metadata"],
    },
  })

  const resultUnsubscribes: Array<() => void> = []
  for (const [tokenId, addresses] of Object.entries(addressesByNomPoolToken)) {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      continue
    }
    if (token.type !== "substrate-native") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      continue
    }
    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      continue
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      continue
    }

    const [chainMeta] = findChainMeta<typeof SubNativeModule>(
      miniMetadatas,
      "substrate-native",
      chain,
    )
    const { nominationPoolsPalletId } = chainMeta ?? {}

    type PoolMembers = {
      tokenId: string
      address: string
      poolId?: string
      points?: string
      unbondingEras: Array<{ era?: string; amount?: string }>
    }
    const subscribePoolMembers = (
      addresses: string[],
      callback: SubscriptionCallback<PoolMembers[]>,
    ) => {
      const scaleCoder = chainStorageCoders.get(chainId)?.poolMembers
      const queries = addresses.flatMap((address): RpcStateQuery<PoolMembers> | [] => {
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} poolMembers query ${address}`,
          address,
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            pool_id?: number
            points?: bigint
            last_recorded_reward_counter?: bigint
            /** Array of `[Era, Amount]` */
            unbonding_eras?: Array<[number | undefined, bigint | undefined] | undefined>
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode poolMembers on chain ${chainId}`,
          )

          const poolId: string | undefined = decoded?.pool_id?.toString?.()
          const points: string | undefined = decoded?.points?.toString?.()
          const unbondingEras: Array<{ era: string; amount: string }> = Array.from(
            decoded?.unbonding_eras ?? [],
          ).flatMap((entry) => {
            if (entry === undefined) return []
            const [key, value] = Array.from(entry)

            const era = key?.toString?.()
            const amount = value?.toString?.()
            if (typeof era !== "string" || typeof amount !== "string") return []

            return { era, amount }
          })

          return { tokenId, address, poolId, points, unbondingEras }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type PoolPoints = { poolId: string; points?: string }
    const subscribePoolPoints = (
      poolIds: string[],
      callback: SubscriptionCallback<PoolPoints[]>,
    ) => {
      if (poolIds.length === 0) callback(null, [])

      const scaleCoder = chainStorageCoders.get(chainId)?.bondedPools
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolPoints> | [] => {
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid poolId in ${chainId} bondedPools query ${poolId}`,
          poolId,
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            commission?: unknown
            member_counter?: number
            points?: bigint
            roles?: unknown
            state?: unknown
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode bondedPools on chain ${chainId}`,
          )

          const points: string | undefined = decoded?.points?.toString?.()

          return { poolId, points }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type PoolStake = { poolId: string; activeStake?: string }
    const subscribePoolStake = (poolIds: string[], callback: SubscriptionCallback<PoolStake[]>) => {
      if (poolIds.length === 0) callback(null, [])

      const scaleCoder = chainStorageCoders.get(chainId)?.ledger
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolStake> | [] => {
        if (!nominationPoolsPalletId) return []
        const stashAddress = nompoolStashAccountId(nominationPoolsPalletId, poolId)
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} ledger query ${stashAddress}`,
          stashAddress,
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            active?: bigint
            legacy_claimed_rewards?: number[]
            stash?: string
            total?: bigint
            unlocking?: Array<{ value?: bigint; era?: number }>
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode ledger on chain ${chainId}`,
          )

          const activeStake: string | undefined = decoded?.active?.toString?.()

          return { poolId, activeStake }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type PoolMetadata = { poolId: string; metadata?: string }
    const subscribePoolMetadata = (
      poolIds: string[],
      callback: SubscriptionCallback<PoolMetadata[]>,
    ) => {
      if (poolIds.length === 0) callback(null, [])

      const scaleCoder = chainStorageCoders.get(chainId)?.metadata
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolMetadata> | [] => {
        if (!nominationPoolsPalletId) return []
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid poolId in ${chainId} metadata query ${poolId}`,
          poolId,
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = Binary

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode metadata on chain ${chainId}`,
          )

          const metadata = decoded?.asText?.()

          return { poolId, metadata }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    const poolMembersByAddress$ = asObservable(subscribePoolMembers)(addresses).pipe(
      scan((state, next) => {
        for (const poolMembers of next) {
          const { poolId, points, unbondingEras } = poolMembers
          if (typeof poolId === "string" && typeof points === "string")
            state.set(poolMembers.address, { poolId, points, unbondingEras })
          else state.set(poolMembers.address, null)
        }
        return state
      }, new Map<string, Required<Pick<PoolMembers, "poolId" | "points" | "unbondingEras">> | null>()),
      share(),
    )

    const poolIdByAddress$ = poolMembersByAddress$.pipe(
      map((pm) => new Map(Array.from(pm).map(([address, pm]) => [address, pm?.poolId ?? null]))),
    )
    const pointsByAddress$ = poolMembersByAddress$.pipe(
      map((pm) => new Map(Array.from(pm).map(([address, pm]) => [address, pm?.points ?? null]))),
    )
    const unbondingErasByAddress$ = poolMembersByAddress$.pipe(
      map(
        (pm) =>
          new Map(Array.from(pm).map(([address, pm]) => [address, pm?.unbondingEras ?? null])),
      ),
    )
    const poolIds$ = poolIdByAddress$.pipe(
      map((byAddress) => [
        ...new Set(Array.from(byAddress.values()).flatMap((poolId) => poolId ?? [])),
      ]),
    )

    const pointsByPool$ = poolIds$.pipe(
      map((poolIds) => asObservable(subscribePoolPoints)(poolIds)),
      switchAll(),
      scan((state, next) => {
        for (const poolPoints of next) {
          const { poolId, points } = poolPoints
          if (typeof points === "string") state.set(poolId, points)
          else state.delete(poolId)
        }
        return state
      }, new Map<string, string>()),
    )
    const stakeByPool$ = poolIds$.pipe(
      map((poolIds) => asObservable(subscribePoolStake)(poolIds)),
      switchAll(),
      scan((state, next) => {
        for (const poolStake of next) {
          const { poolId, activeStake } = poolStake
          if (typeof activeStake === "string") state.set(poolId, activeStake)
          else state.delete(poolId)
        }
        return state
      }, new Map<string, string>()),
    )
    const metadataByPool$ = poolIds$.pipe(
      map((poolIds) => asObservable(subscribePoolMetadata)(poolIds)),
      switchAll(),
      scan((state, next) => {
        for (const poolMetadata of next) {
          const { poolId, metadata } = poolMetadata
          if (typeof metadata === "string") state.set(poolId, metadata)
          else state.delete(poolId)
        }
        return state
      }, new Map<string, string>()),
    )

    const subscription = combineLatest([
      poolIdByAddress$,
      pointsByAddress$,
      unbondingErasByAddress$,
      pointsByPool$,
      stakeByPool$,
      metadataByPool$,
    ]).subscribe({
      next: ([
        poolIdByAddress,
        pointsByAddress,
        unbondingErasByAddress,
        pointsByPool,
        stakeByPool,
        metadataByPool,
      ]) => {
        const balances = Array.from(poolIdByAddress)
          .map(([address, poolId]) => {
            const parsedPoolId = poolId === null ? undefined : parseInt(poolId)
            const points = pointsByAddress.get(address) ?? "0"
            const poolPoints = pointsByPool.get(poolId ?? "") ?? "0"
            const poolStake = stakeByPool.get(poolId ?? "") ?? "0"
            const poolMetadata = poolId
              ? (metadataByPool.get(poolId) ?? `Pool ${poolId}`)
              : undefined

            const amount =
              points === "0" || poolPoints === "0" || poolStake === "0"
                ? 0n
                : (BigInt(poolStake) * BigInt(points)) / BigInt(poolPoints)

            const unbondingAmount = (unbondingErasByAddress.get(address) ?? []).reduce(
              (total, { amount }) => total + BigInt(amount ?? "0"),
              0n,
            )

            return {
              source: "substrate-native",
              status: "live",
              address,
              multiChainId: { subChainId: chainId },
              chainId,
              tokenId,
              values: [
                {
                  source: "nompools-staking",
                  type: "nompool",
                  label: "nompools-staking",
                  amount: amount.toString(),
                  meta: { type: "nompool", poolId: parsedPoolId, description: poolMetadata },
                },
                {
                  source: "nompools-staking",
                  type: "nompool",
                  label: "nompools-unbonding",
                  amount: unbondingAmount.toString(),
                  meta: {
                    poolId: parsedPoolId,
                    description: poolMetadata,
                    unbonding: true,
                  },
                },
              ],
            } as SubNativeBalance
          })
          .filter(Boolean) as SubNativeBalance[]

        if (balances.length > 0) callback(null, balances)
      },
      error: (error) => callback(error),
    })

    resultUnsubscribes.push(() => subscription.unsubscribe())
  }
  return () => resultUnsubscribes.forEach((unsub) => unsub())
}
