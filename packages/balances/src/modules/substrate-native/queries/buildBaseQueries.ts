import { decodeScale, ScaleStorageCoder } from "@talismn/scale"
import { isNotNil } from "@talismn/util"
import { Binary, Enum } from "polkadot-api"

import { AmountWithLabel, IBalance, MiniMetadata } from "../../../types"
import { BalanceDef, buildNetworkStorageCoders } from "../../shared"
import { MaybeStateKey, RpcQueryPack } from "../../shared/rpcQueryPack"
import { MiniMetadataExtra } from "../config"
import { getLockedType } from "../util/lockTypes"

export type NomPoolMemberInfo = {
  points: string
  poolId: string
  unbondingEras: Array<{ era: string; amount: string }>
}

export type BaseBalance = { balance: IBalance; nomPoolMemberInfo: NomPoolMemberInfo | null }

export const buildBaseQueries = (
  networkId: string,
  balanceDefs: BalanceDef<"substrate-native">[],
  miniMetadata: MiniMetadata<MiniMetadataExtra>,
): Array<RpcQueryPack<BaseBalance>> => {
  const networkStorageCoders = buildNetworkStorageCoders(networkId, miniMetadata, {
    account: ["System", "Account"],
    stakingLedger: ["Staking", "Ledger"],
    reserves: ["Balances", "Reserves"], // unused ??
    holds: ["Balances", "Holds"],
    locks: ["Balances", "Locks"],
    freezes: ["Balances", "Freezes"],
    poolMembers: ["NominationPools", "PoolMembers"],
  })

  if (!networkStorageCoders)
    throw new Error(`No network storage coders found for networkId: ${networkId}`)

  return balanceDefs
    .map(({ token, address }): RpcQueryPack<BaseBalance> | null => {
      const getStateKeys = () => {
        try {
          const accountStateKey = networkStorageCoders.account
            ? (networkStorageCoders.account.keys.enc(address) as `0x${string}`)
            : null

          const locksStateKey = networkStorageCoders.locks
            ? (networkStorageCoders.locks.keys.enc(address) as `0x${string}`)
            : null

          const freezesStateKey = networkStorageCoders.freezes
            ? (networkStorageCoders.freezes.keys.enc(address) as `0x${string}`)
            : null

          const holdsStateKey = networkStorageCoders.holds
            ? (networkStorageCoders.holds.keys.enc(address) as `0x${string}`)
            : null

          const stakingLedgerStateKey = networkStorageCoders.stakingLedger
            ? (networkStorageCoders.stakingLedger.keys.enc(address) as `0x${string}`)
            : null

          const poolMemberStateKey = networkStorageCoders.poolMembers
            ? (networkStorageCoders.poolMembers.keys.enc(address) as `0x${string}`)
            : null

          return [
            accountStateKey,
            locksStateKey,
            freezesStateKey,
            holdsStateKey,
            stakingLedgerStateKey,
            poolMemberStateKey,
          ]
        } catch {
          // most likely invalid address
          return []
        }
      }

      return {
        stateKeys: getStateKeys(),
        decodeResult: (changes: MaybeStateKey[]) => {
          const balance: IBalance = {
            source: "substrate-native",
            status: "live",
            address,
            networkId,
            tokenId: token.id,
            values: [],
            useLegacyTransferableCalculation: miniMetadata.extra.useLegacyTransferableCalculation,
          }

          let nomPoolMemberInfo: NomPoolMemberInfo | null = null

          const [
            accountChange,
            lockChange,
            freezesChange,
            holdsChange,
            stakingLedgerChange,
            nomPoolMemberChange,
          ] = changes

          if (networkStorageCoders.account) {
            // for account balance we decode even empty values
            const baseValues = decodeBaseResult(
              networkStorageCoders.account,
              accountChange,
              networkId,
            )
            balance.values.push(...baseValues)
          }

          if (networkStorageCoders.locks && lockChange) {
            const lockValues = decodeLocksResult(networkStorageCoders.locks, lockChange, networkId)
            balance.values.push(...lockValues)
          }

          if (networkStorageCoders.freezes && freezesChange) {
            const freezesValues = decodeFreezesResult(
              networkStorageCoders.freezes,
              freezesChange,
              networkId,
            )
            balance.values.push(...freezesValues)
          }

          if (networkStorageCoders.holds && holdsChange) {
            const holdsValues = decodeHoldsResult(
              networkStorageCoders.holds,
              holdsChange,
              networkId,
            )
            balance.values.push(...holdsValues)
          }

          if (networkStorageCoders.stakingLedger && stakingLedgerChange) {
            const stakingLedgerValues = decodeStakingLedgerResult(
              networkStorageCoders.stakingLedger,
              stakingLedgerChange,
              networkId,
            )
            balance.values.push(...stakingLedgerValues)
          }

          if (networkStorageCoders.poolMembers && nomPoolMemberChange) {
            const nomPoolMemberValue = decodePoolMemberResult(
              networkStorageCoders.poolMembers,
              nomPoolMemberChange,
              networkId,
            )

            if (nomPoolMemberValue) nomPoolMemberInfo = nomPoolMemberValue
          }

          return { balance, nomPoolMemberInfo }
        },
      }
    })
    .filter(isNotNil)
}

const decodeBaseResult = (
  coder: ScaleStorageCoder,
  value: string | null,
  networkId: string,
): Array<AmountWithLabel<string>> => {
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
  const decoded = decodeScale<DecodedType>(
    coder,
    value,
    `Failed to decode base native balance on chain ${networkId}`,
  )

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
  // const existingValues = Object.fromEntries(
  //   balanceJson.values.map((v) => [getValueId(v), v]),
  // )
  const newValues: AmountWithLabel<string>[] = [
    { type: "free", label: "free", amount: free.toString() },
    { type: "reserved", label: "reserved", amount: reserved.toString() },
    { type: "locked", label: "misc", amount: miscLock.toString() },
    { type: "locked", label: "fees", amount: feesLock.toString() },
  ]

  return newValues
}

const decodeLocksResult = (
  coder: ScaleStorageCoder,
  value: string | null,
  networkId: string,
): Array<AmountWithLabel<string>> => {
  /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
  type DecodedType = Array<{
    id?: Binary
    amount?: bigint
  }>

  const decoded = decodeScale<DecodedType>(
    coder,
    value,
    `Failed to decode lock on chain ${networkId}`,
  )

  const locksQueryLocks: Array<AmountWithLabel<string>> =
    decoded?.map?.((lock) => ({
      type: "locked",
      source: "substrate-native-locks",
      label: getLockedType(lock?.id?.asText?.()),
      meta: { id: lock?.id?.asText?.() },
      amount: (lock?.amount ?? 0n).toString(),
    })) ?? []

  return locksQueryLocks
}

const decodeFreezesResult = (
  coder: ScaleStorageCoder,
  value: `0x${string}` | null,
  networkId: string,
): Array<AmountWithLabel<string>> => {
  /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
  type DecodedType = Array<{
    id?: { type?: string }
    amount?: bigint
  }>

  const decoded = decodeScale<DecodedType>(
    coder,
    value,
    `Failed to decode freeze on chain ${networkId}`,
  )

  const freezesValues: Array<AmountWithLabel<string>> =
    decoded?.map?.((lock) => ({
      type: "locked",
      source: "substrate-native-freezes",
      label: getLockedType(lock?.id?.type?.toLowerCase?.()),
      amount: lock?.amount?.toString?.() ?? "0",
    })) ?? []

  return freezesValues
}

const decodeHoldsResult = (
  coder: ScaleStorageCoder,
  value: `0x${string}` | null,
  networkId: string,
): Array<AmountWithLabel<string>> => {
  /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
  type DecodedType = Array<{
    id?: Enum<{ DelegatedStaking: Enum<{ StakingDelegation: undefined }> }>
    amount?: bigint
  }>

  const decoded = decodeScale<DecodedType>(
    coder,
    value,
    `Failed to decode holds on chain ${networkId}`,
  )

  // at this time we re only interested in DelegatedStaking holds, to determine if nom pool staked amount is included in reserved or not
  const holdsValues: Array<AmountWithLabel<string>> =
    decoded
      ?.filter((hold) => hold.id?.type)
      .map((hold) => ({
        type: "locked",
        source: "substrate-native-holds",
        label: hold.id!.type,
        // anount needs to be 0 or a row could appear in the UI, this entry is just for information
        amount: "0",
        meta: { amount: (hold?.amount ?? 0n).toString() },
      })) ?? []

  return holdsValues
}

const decodeStakingLedgerResult = (
  coder: ScaleStorageCoder,
  value: `0x${string}` | null,
  networkId: string,
): Array<AmountWithLabel<string>> => {
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
    coder,
    value,
    `Failed to decode unbonding query on chain ${networkId}`,
  )

  const totalUnlocking =
    decoded?.unlocking?.reduce?.((acc, unlocking) => acc + unlocking.value, 0n) ?? 0n

  const stakingLedgerResults: Array<AmountWithLabel<string>> =
    totalUnlocking <= 0n
      ? []
      : [
          {
            type: "locked",
            source: "substrate-native-unbonding",
            label: "Unbonding",
            amount: totalUnlocking.toString(),
          },
        ]

  return stakingLedgerResults
}

const decodePoolMemberResult = (
  coder: ScaleStorageCoder,
  value: `0x${string}` | null,
  networkId: string,
): NomPoolMemberInfo | null => {
  /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
  type DecodedType = {
    pool_id: number
    points: bigint
    last_recorded_reward_counter?: bigint
    /** Array of `[Era, Amount]` */
    unbonding_eras: Array<[number, bigint] | undefined>
  }

  const decoded = decodeScale<DecodedType>(
    coder,
    value,
    `Failed to decode poolMembers on chain ${networkId}`,
  )

  if (!decoded) return null

  const poolId: string = decoded.pool_id.toString()
  const points: string = decoded.points.toString()
  const unbondingEras: Array<{ era: string; amount: string }> = Array.from(
    decoded.unbonding_eras ?? [],
  ).flatMap((entry) => {
    if (entry === undefined) return []
    const [key, value] = Array.from(entry)

    const era = key.toString()
    const amount = value.toString()
    if (typeof era !== "string" || typeof amount !== "string") return []

    return { era, amount }
  })

  return { poolId, points, unbondingEras }
}
