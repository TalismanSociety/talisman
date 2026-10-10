import type { BalanceLockType } from "./util/lockTypes"

export const EVM_MIRROR_LOCK_LABEL = "evm-mirror" satisfies BalanceLockType

/** Funds on the EVM mirror of a substrate account, which that account can `EVM.withdraw` */
export type EvmMirrorWithdrawableMeta = {
  type: "evm-mirror-withdrawable"
  /** truncated H160 of the substrate account: the `address` argument of `EVM.withdraw` */
  h160: `0x${string}`
  /** ss58 (generic prefix) of the mirror account that holds the funds */
  mirror: string
}

// structural subset of the formatted locks exposed by Balance#locks,
// kept loose to avoid a circular dependency on the Balance class
type BalanceLockLike = {
  amount: { planck: bigint }
  meta?: unknown
}

export const isEvmMirrorWithdrawableLock = <T extends Pick<BalanceLockLike, "meta">>(
  lock: T
): lock is T & { meta: EvmMirrorWithdrawableMeta } =>
  (lock.meta as Partial<EvmMirrorWithdrawableMeta> | undefined)?.type === "evm-mirror-withdrawable"

export type EvmMirrorWithdrawable = EvmMirrorWithdrawableMeta & { amount: bigint }

export const findEvmMirrorWithdrawable = (
  locks: BalanceLockLike[] | null | undefined
): EvmMirrorWithdrawable | null => {
  const lock = locks?.find(isEvmMirrorWithdrawableLock)
  return lock ? { ...lock.meta, amount: lock.amount.planck } : null
}
