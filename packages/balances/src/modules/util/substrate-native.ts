import type { Registry } from "@polkadot/types-codec/types"
import { BN, bnToU8a, hexToU8a, stringToU8a, u8aConcat, u8aToHex } from "@polkadot/util"
import { blake2AsU8a } from "@polkadot/util-crypto"
import upperFirst from "lodash/upperFirst"
import { Observable } from "rxjs"

import {
  Balance,
  BalanceFormatter,
  LockedAmount,
  SubscriptionCallback,
  UnsubscribeFn,
} from "../../types"

/**
 * Converts a subscription function into an Observable
 *
 * The type of a subscription function which can be converted into an observable:
 *
 *     <TArgs, TResult>(...arguments: TArgs, callback: SubscriptionCallback<TResult>) => UnsubscribeFn
 */
export const asObservable =
  <T extends unknown[], R>(handler: (...args: [...T, SubscriptionCallback<R>]) => UnsubscribeFn) =>
  (...args: T) =>
    new Observable<R>((subscriber) => {
      const callback: SubscriptionCallback<R> = (error, result) =>
        error ? subscriber.error(error) : subscriber.next(result)

      const unsubscribe = handler(...args, callback)

      return unsubscribe
    })

/**
 * Each nominationPool in the nominationPools pallet has access to some accountIds which have no
 * associated private key. Instead, they are derived from this function.
 */
const nompoolAccountId = (registry: Registry, palletId: string, poolId: string, index: number) => {
  const EMPTY_H256 = new Uint8Array(32)
  const MOD_PREFIX = stringToU8a("modl")
  const U32_OPTS = { bitLength: 32, isLe: true }
  return registry
    .createType(
      "AccountId32",
      u8aConcat(
        MOD_PREFIX,
        hexToU8a(palletId),
        new Uint8Array([index]),
        bnToU8a(new BN(poolId), U32_OPTS),
        EMPTY_H256
      )
    )
    .toString()
}
/** The stash account for the nomination pool */
export const nompoolStashAccountId = (registry: Registry, palletId: string, poolId: string) =>
  nompoolAccountId(registry, palletId, poolId, 0)
/** The rewards account for the nomination pool */
export const nompoolRewardAccountId = (registry: Registry, palletId: string, poolId: string) =>
  nompoolAccountId(registry, palletId, poolId, 1)

/**
 * Crowdloan contributions are stored in the `childstate` key returned by this function.
 */
export const crowdloanFundContributionsChildKey = (registry: Registry, fundIndex: number) =>
  u8aToHex(
    u8aConcat(
      ":child_storage:default:",
      blake2AsU8a(u8aConcat("crowdloan", registry.createType("u32", fundIndex).toU8a()))
    )
  )

export type BalanceLockType =
  | "reserved"
  | "democracy"
  | "crowdloan"
  | "staking"
  | "nompools-staking"
  | "nompools-unbonding"
  | "vesting"
  | "dapp-staking"
  | `other-${string}`
  | "other"

const getOtherType: (input: string) => `other-${string}` = (input) =>
  `other-${input}` as `other-${string}`

/**
 * For converting the value of `lock?.id?.toUtf8?.()` which is retrieved from
 * the Balances.Locks storage key into a useful classification for our UI
 */
export const getLockedType = (input?: string): BalanceLockType => {
  if (typeof input !== "string") return getOtherType("unknown")

  if (input.includes("vesting")) return "vesting"
  if (input.includes("calamvst")) return "vesting" // vesting on manta network
  if (input.includes("ormlvest")) return "vesting" // vesting ORML tokens
  if (input.includes("democrac")) return "democracy"
  if (input.includes("democracy")) return "democracy"
  if (input.includes("phrelect")) return "democracy" // specific to council
  if (input.includes("staking")) return "staking"
  if (input.includes("stkngdel")) return "staking" // staking delegator
  if (input.includes("stkngcol")) return "staking" // staking collator
  if (input.includes("kiltpstk")) return "staking" // Kilt specific staking
  if (input.includes("dapstake")) return "dapp-staking" // Astar specific
  if (input.includes("appstake")) return "dapp-staking" // Quartz (unique) specific
  if (input.includes("dappstaking")) return "dapp-staking"

  // Joystream specifics https://github.com/Joystream/pioneer/blob/dev/packages/ui/src/accounts/model/lockTypes.ts
  if (input.includes("voting")) return "democracy"
  if (input.includes("candidac")) return "democracy" // Council Candidate
  if (input.includes("councilo")) return "democracy" // Councilor
  if (input.includes("proposal")) return "democracy"
  if (input.includes("boundsta")) return "staking" // Bound Staking Account
  if (input.includes("invitemb")) return getOtherType(input) // Invite member
  if (input.includes("bounty")) return getOtherType(input)
  if (input.startsWith("wg-")) return getOtherType(input)

  // ignore technical or undocumented lock types
  if (input.includes("pdexlock")) return getOtherType(input)
  if (input.includes("phala/sp")) return getOtherType(input)

  // eslint-disable-next-line no-console
  console.warn(`unknown locked type: ${input}`)
  return getOtherType(input)
}

const baseLockLabels = ["fees", "misc"]
const isBaseLock = (lock: Pick<LockedAmount<string>, "label">) =>
  baseLockLabels.includes(lock.label)
const isNonBaseLock = (lock: Pick<LockedAmount<string>, "label">) => !isBaseLock(lock)
export const filterBaseLocks = (
  locks: Array<Omit<LockedAmount<string>, "amount"> & { amount: BalanceFormatter }>
) => {
  const hasNonBaseLocks = locks.some(isNonBaseLock)
  if (!hasNonBaseLocks) return locks

  return locks.filter(isNonBaseLock)
}

// TODO: Make these titles translatable
export const getLockTitle = (
  lock: Pick<LockedAmount<string>, "label" | "meta">,
  { balance }: { balance?: Balance } = {}
) => {
  if (!lock.label) return lock.label

  if (lock.label === "democracy") return "Governance"
  if (lock.label === "crowdloan") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paraId = (lock.meta as any)?.paraId
    if (!paraId) return "Crowdloan"

    const name = balance?.chain?.parathreads?.find(
      (parathread) => parathread?.paraId === paraId
    )?.name

    return `${name ? name : `Parachain ${paraId}`} Crowdloan`
  }
  if (lock.label === "nompools-staking") return "Pooled Staking"
  if (lock.label === "nompools-unbonding") return "Pooled Staking"
  if (lock.label === "dapp-staking") return "DApp Staking"
  if (lock.label === "fees") return "Locked (Fees)"
  if (lock.label === "misc") return "Locked"
  if (lock.label.startsWith("other")) return "Locked"

  return upperFirst(lock.label)
}
