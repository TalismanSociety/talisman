import { Chain, Token } from "@talismn/chaindata-provider"
import { Binary, decodeScale, encodeStateKey } from "@talismn/scale"
import { BigMath, blake2Concat, decodeAnyAddress } from "@talismn/util"
import { Struct, u32, u128 } from "scale-ts"

import log from "../../../log"
import { AddressesByToken, AmountWithLabel, getValueId, MiniMetadata } from "../../../types"
import { findChainMeta, RpcStateQuery, StorageCoders } from "../../util"
import { SubNativeBalance, SubNativeToken } from "../types"
import { getLockedType } from "./balanceLockTypes"

export type QueryKey = string

// AccountInfo is the state_storage data format for nativeToken balances
// Theory: new chains will be at least on metadata v14, and so we won't need to hardcode their AccountInfo type.
// But for chains we want to support which aren't on metadata v14, hardcode them here:
// If the chain upgrades to metadata v14, this override will be ignored :)
const RegularAccountInfoFallback = Struct({
  nonce: u32,
  consumers: u32,
  providers: u32,
  sufficients: u32,
  data: Struct({ free: u128, reserved: u128, miscFrozen: u128, feeFrozen: u128 }),
})
const NoSufficientsAccountInfoFallback = Struct({
  nonce: u32,
  consumers: u32,
  providers: u32,
  data: Struct({ free: u128, reserved: u128, miscFrozen: u128, feeFrozen: u128 }),
})
const AccountInfoOverrides: Record<
  string,
  typeof RegularAccountInfoFallback | typeof NoSufficientsAccountInfoFallback | undefined
> = {
  // crown-sterlin is not yet on metadata v14
  "crown-sterling": NoSufficientsAccountInfoFallback,

  // crust is not yet on metadata v14
  "crust": NoSufficientsAccountInfoFallback,

  // kulupu is not yet on metadata v14
  "kulupu": RegularAccountInfoFallback,

  // nftmart is not yet on metadata v14
  "nftmart": RegularAccountInfoFallback,
}

export async function buildQueries(
  chains: Record<string, Chain>,
  tokens: Record<string, Token>,
  chainStorageCoders: StorageCoders<{
    base: ["System", "Account"]
    stakingLedger: ["Staking", "Ledger"]
    reserves: ["Balances", "Reserves"]
    holds: ["Balances", "Holds"]
    locks: ["Balances", "Locks"]
    freezes: ["Balances", "Freezes"]
  }>,
  miniMetadatas: Map<string, MiniMetadata>,
  addressesByToken: AddressesByToken<SubNativeToken>,
): Promise<Record<QueryKey, Array<RpcStateQuery<SubNativeBalance>>>> {
  return Object.entries(addressesByToken).reduce<
    Record<QueryKey, Array<RpcStateQuery<SubNativeBalance>>>
  >((outerResult, [tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      return outerResult
    }
    if (token.type !== "substrate-native") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      return outerResult
    }
    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      return outerResult
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      return outerResult
    }

    const [chainMeta] = findChainMeta(miniMetadatas, "substrate-native", chain)
    const { useLegacyTransferableCalculation } = chainMeta ?? {}

    addresses.flat().forEach((address) => {
      const queryKey = `${tokenId}-${address}`
      // We share this balanceJson between the base and the lock query for this address
      const balanceJson: SubNativeBalance = {
        source: "substrate-native",
        status: "live",
        address,
        multiChainId: { subChainId: chainId },
        chainId,
        tokenId,
        values: [],
      }
      if (useLegacyTransferableCalculation) balanceJson.useLegacyTransferableCalculation = true

      let locksQueryLocks: Array<AmountWithLabel<string>> = []
      let freezesQueryLocks: Array<AmountWithLabel<string>> = []
      let unbondingQueryLocks: Array<AmountWithLabel<string>> = []

      const baseQuery: RpcStateQuery<SubNativeBalance> | undefined = (() => {
        // For chains which are using metadata < v14
        const getFallbackStateKey = () => {
          const addressBytes = decodeAnyAddress(address)
          const addressHash = blake2Concat(addressBytes).replace(/^0x/, "")
          const moduleHash = "26aa394eea5630e07c48ae0c9558cef7" // util_crypto.xxhashAsHex("System", 128);
          const storageHash = "b99d880ec681799c0cf30e8886371da9" // util_crypto.xxhashAsHex("Account", 128);
          const moduleStorageHash = `${moduleHash}${storageHash}` // System.Account is the state_storage key prefix for nativeToken balances
          return `0x${moduleStorageHash}${addressHash}`
        }

        const scaleCoder = chainStorageCoders.get(chainId)?.base
        // NOTE: Only use fallback key when `scaleCoder` is not defined
        // i.e. when chain doesn't have metadata v14/v15
        const stateKey = scaleCoder
          ? encodeStateKey(
              scaleCoder,
              `Invalid address in ${chainId} base query ${address}`,
              address,
            )
          : getFallbackStateKey()
        if (!stateKey) return

        const decodeResult = (change: string | null) => {
          // BEGIN: Handle chains which use metadata < v14
          let oldChainBalance = null
          if (!scaleCoder) {
            const scaleAccountInfo = AccountInfoOverrides[chainId]
            if (scaleAccountInfo === undefined) {
              // chain metadata version is < 15 and we also don't have an override hardcoded in
              // the best way to handle this case: log a warning and return an empty balance
              log.debug(
                `Token ${tokenId} on chain ${chainId} has no balance type for decoding. Defaulting to a balance of 0 (zero).`,
              )
              return balanceJson
            }

            try {
              // eslint-disable-next-line no-var
              oldChainBalance = change === null ? null : scaleAccountInfo.dec(change)
            } catch (error) {
              log.warn(
                `Failed to create pre-metadataV14 balance type for token ${tokenId} on chain ${chainId}: ${error?.toString()}`,
              )
              return balanceJson
            }
          }
          // END: Handle chains which use metadata < v14

          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            data?: {
              flags?: bigint
              free?: bigint
              frozen?: bigint
              reserved?: bigint

              // deprecated fields (they only show up on old chains)
              feeFrozen?: bigint
              miscFrozen?: bigint
            }
          }
          const decoded =
            decodeScale<DecodedType>(
              scaleCoder,
              change,
              `Failed to decode balance on chain ${chainId}`,
            ) ?? oldChainBalance

          const free = (decoded?.data?.free ?? 0n).toString()
          const reserved = (decoded?.data?.reserved ?? 0n).toString()
          const miscLock = (
            (decoded?.data?.miscFrozen ?? 0n) +
            // new chains don't split their `frozen` amount into `feeFrozen` and `miscFrozen`.
            // for these chains, we'll use the `frozen` amount as `miscFrozen`.
            ((decoded?.data as DecodedType["data"])?.frozen ?? 0n)
          ).toString()
          const feesLock = (decoded?.data?.feeFrozen ?? 0n).toString()

          // even if these values are 0, we still need to add them to the balanceJson.values array
          // so that the balance pool can handle newly zeroed balances
          const existingValues = Object.fromEntries(
            balanceJson.values.map((v) => [getValueId(v), v]),
          )
          const newValues: AmountWithLabel<string>[] = [
            { type: "free", label: "free", amount: free.toString() },
            { type: "reserved", label: "reserved", amount: reserved.toString() },
            { type: "locked", label: "misc", amount: miscLock.toString() },
            { type: "locked", label: "fees", amount: feesLock.toString() },
          ]

          const newValuesObj = Object.fromEntries(newValues.map((v) => [getValueId(v), v]))

          balanceJson.values = Object.values({ ...existingValues, ...newValuesObj })

          return balanceJson
        }

        return { chainId, stateKey, decodeResult }
      })()

      const locksQuery: RpcStateQuery<SubNativeBalance> | undefined = (() => {
        const scaleCoder = chainStorageCoders.get(chainId)?.locks
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} locks query ${address}`,
          address,
        )
        if (!stateKey) return

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = Array<{
            id?: Binary
            amount?: bigint
          }>

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode lock on chain ${chainId}`,
          )

          locksQueryLocks =
            decoded?.map?.((lock) => ({
              type: "locked",
              source: "substrate-native-locks",
              label: getLockedType(lock?.id?.asText?.()),
              meta: { id: lock?.id?.asText?.() },
              amount: (lock?.amount ?? 0n).toString(),
            })) ?? []

          // locked values should be replaced entirely, not merged or appended
          const nonLockValues = balanceJson.values.filter(
            (v) => v.source !== "substrate-native-locks",
          )
          balanceJson.values = nonLockValues.concat(locksQueryLocks)

          // fix any double-counting between Balances.Locks (for staking locks) and Staking.Ledger (for unbonding locks)
          balanceJson.values = updateStakingLocksUsingUnbondingLocks(balanceJson.values)

          return balanceJson
        }

        return { chainId, stateKey, decodeResult }
      })()

      const freezesQuery: RpcStateQuery<SubNativeBalance> | undefined = (() => {
        const scaleCoder = chainStorageCoders.get(chainId)?.freezes
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} freezes query ${address}`,
          address,
        )
        if (!stateKey) return

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = Array<{
            id?: { type?: string }
            amount?: bigint
          }>

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode freeze on chain ${chainId}`,
          )

          freezesQueryLocks =
            decoded?.map?.((lock) => ({
              type: "locked",
              source: "substrate-native-freezes",
              label: getLockedType(lock?.id?.type?.toLowerCase?.()),
              amount: lock?.amount?.toString?.() ?? "0",
            })) ?? []

          // freezes values should be replaced entirely, not merged or appended
          const nonFreezesValues = balanceJson.values.filter(
            (v) => v.source !== "substrate-native-freezes",
          )
          balanceJson.values = nonFreezesValues.concat(freezesQueryLocks)

          return balanceJson
        }

        return { chainId, stateKey, decodeResult }
      })()

      const unbondingQuery: RpcStateQuery<SubNativeBalance> | undefined = (() => {
        const scaleCoder = chainStorageCoders.get(chainId)?.stakingLedger
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} unbonding query ${address}`,
          address,
        )
        if (!stateKey) return

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type DecodedType = {
            active: bigint
            legacy_claimed_rewards: number[]
            stash: string
            total: bigint
            unlocking: Array<{
              era: number
              value: bigint
            }>
          } | null

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode unbonding query on chain ${chainId}`,
          )

          const totalUnlocking =
            decoded?.unlocking?.reduce?.((acc, unlocking) => acc + unlocking.value, 0n) ?? 0n
          if (totalUnlocking <= 0n) unbondingQueryLocks = []
          else {
            unbondingQueryLocks = [
              {
                type: "locked",
                source: "substrate-native-unbonding",
                label: "Unbonding",
                amount: totalUnlocking.toString(),
              },
            ]
          }

          // unbonding values should be replaced entirely, not merged or appended
          const nonUnbondingValues = balanceJson.values.filter(
            (v) => v.source !== "substrate-native-unbonding",
          )
          balanceJson.values = nonUnbondingValues.concat(unbondingQueryLocks)

          // fix any double-counting between Balances.Locks (for staking locks) and Staking.Ledger (for unbonding locks)
          balanceJson.values = updateStakingLocksUsingUnbondingLocks(balanceJson.values)

          return balanceJson
        }

        return { chainId, stateKey, decodeResult }
      })()

      const queries = [baseQuery, locksQuery, freezesQuery, unbondingQuery].filter(
        (query): query is RpcStateQuery<SubNativeBalance> => Boolean(query),
      )

      outerResult[queryKey] = queries
    })

    return outerResult
  }, {})
}

/**
 * Using the Balances.Locks query, we can find the amount of tokens locked up in the staking pallet.
 * But without more information, we cannot determine if these tokens are actively staked or are unbonding.
 *
 * Using the Staking.Ledger query we can determine how many of these tokens are currently unbonding.
 * But there is an overlap between our first query (the tokens locked in the staking pallet),
 * and our second query (the tokens which are locked in the staking pallet and are unbonding).
 *
 * So, we need to subtract the unbonding tokens from the staking locked tokens, in order to provide an accurate view
 * of [tokens being staked] vs [tokens being unbonded].
 *
 * When this function is given the `values` property of a SubNative BalanceJson, it will modify the staking locks
 * to subtract their totals by an amount based on the unbonding locks.
 *
 * It keeps track of the original staking lock totals for any which have been modified, by storing them in `lock.meta.totalAmount`.
 * As such, this function is idempotent. You can call it many times on the same data and the result will be correct.
 */
const updateStakingLocksUsingUnbondingLocks = (
  values: AmountWithLabel<string>[],
): AmountWithLabel<string>[] => {
  const stakingLocks: AmountWithLabel<string>[] = []
  const otherValues: AmountWithLabel<string>[] = []
  values.forEach((value) => {
    if (value.type !== "locked") return otherValues.push(value)
    if (value.source !== "substrate-native-locks") return otherValues.push(value)
    if (!(value.meta as { id?: string })?.id?.includes("staking")) return otherValues.push(value)

    return stakingLocks.push(value)
  })

  const unbondingLocks = values.filter(
    (value) => value.type === "locked" && value.source === "substrate-native-unbonding",
  )

  // step 1: reset all staking locks to their original amounts, to make this function idempotent
  stakingLocks.forEach((lock) => {
    const totalAmount = (lock?.meta as { totalAmount?: string })?.totalAmount
    if (typeof totalAmount !== "string") return

    lock.amount = totalAmount
    delete (lock?.meta as { totalAmount?: string })?.totalAmount
  })

  // step 2: subtract unbonding amounts from staking locks
  let totalUnbonding = unbondingLocks.reduce((acc, { amount }) => acc + BigInt(amount), 0n)
  while (totalUnbonding > 0n) {
    const nextLock = stakingLocks.find((lock) => BigInt(lock.amount) > 0n)
    if (!nextLock) {
      break
    }

    // set nextLock.meta.totalAmount so we can revert the change we are about to make to nextLock.amount
    ;(nextLock.meta as { totalAmount?: string }).totalAmount = nextLock.amount

    const lockAmount = BigInt(nextLock.amount)
    nextLock.amount = BigMath.max(0n, lockAmount - totalUnbonding).toString()
    totalUnbonding -= lockAmount
  }

  return [...otherValues, ...stakingLocks]
}
