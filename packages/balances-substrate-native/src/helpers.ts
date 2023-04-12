import type { Registry } from "@polkadot/types-codec/types"
import { BN, bnToU8a, hexToU8a, stringToU8a, u8aConcat, u8aToHex } from "@polkadot/util"
import { blake2AsU8a } from "@polkadot/util-crypto"
import { SubscriptionCallback, UnsubscribeFn } from "@talismn/balances"
import { Observable } from "rxjs"

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
export const nompoolStashAccountId = (registry: Registry, palletId: string, poolId: string) =>
  nompoolAccountId(registry, palletId, poolId, 0)
export const nompoolRewardAccountId = (registry: Registry, palletId: string, poolId: string) =>
  nompoolAccountId(registry, palletId, poolId, 1)

export const crowdloanFundContributionsChildKey = (registry: Registry, fundIndex: number) =>
  u8aToHex(
    u8aConcat(
      ":child_storage:default:",
      blake2AsU8a(u8aConcat("crowdloan", registry.createType("u32", fundIndex).toU8a()))
    )
  )

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

export type BalanceLockType =
  | "democracy"
  | "crowdloan"
  | "staking"
  | "nompools-staking"
  | "vesting"
  | "dapp-staking"
  | "other"

export const getLockedType = (input: string): BalanceLockType => {
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
  if (input.includes("appstake")) return "dapp-staking" // Quartz (unique) specific

  // Joystream specifics https://github.com/Joystream/pioneer/blob/dev/packages/ui/src/accounts/model/lockTypes.ts
  if (input.includes("voting")) return "democracy"
  if (input.includes("candidac")) return "democracy" // Council Candidate
  if (input.includes("councilo")) return "democracy" // Councilor
  if (input.includes("proposal")) return "democracy"
  if (input.includes("boundsta")) return "staking" // Bound Staking Account
  if (input.includes("invitemb")) return "other" // Invite member
  if (input.includes("bounty")) return "other"
  if (input.startsWith("wg-")) return "other"

  // ignore technical or undocumented lock types
  if (input.includes("pdexlock")) return "other"
  if (input.includes("phala/sp")) return "other"

  // eslint-disable-next-line no-console
  console.warn(`unknown locked type: ${input}`)
  return "other"
}
