import type { ScaleApi } from "@talismn/sapi"

type GetBittensorConvictionLockPayloadProps = {
  sapi: ScaleApi
  address: string
  hotkey: string
  netuid: number
  amount: bigint
  /** target state: true => perpetual (freeze decay), false => decaying (resume decay) */
  makePerpetual: boolean
  /** current persisted decay mode on chain, even if no active lock exists */
  currentIsPerpetual: boolean
}

/**
 * Builds the extrinsic that creates (or tops up) a conviction lock on a subnet.
 *
 * `SubtensorModule.lock_stake` locks already-staked alpha to a hotkey for governance conviction.
 * It creates a lock if none exists for the (coldkey, netuid), otherwise tops up the existing one
 * (the chain rejects a different hotkey with `LockHotkeyMismatch`).
 *
 * The persisted decay flag can survive after lock mass reaches zero, so we include
 * `set_perpetual_lock` after `lock_stake` whenever the target type differs from the current
 * on-chain type. When no flag flip is needed, submit `lock_stake` directly instead of wrapping a
 * single call in `Utility.batch_all`.
 */
export const getBittensorConvictionLockPayload = ({
  sapi,
  address,
  hotkey,
  netuid,
  amount,
  makePerpetual,
  currentIsPerpetual,
}: GetBittensorConvictionLockPayloadProps) => {
  const lockStakeArgs = {
    hotkey,
    netuid,
    amount,
  }

  if (makePerpetual === currentIsPerpetual)
    return sapi.getExtrinsicPayload("SubtensorModule", "lock_stake", lockStakeArgs, { address })

  const calls = [
    sapi.getDecodedCall("SubtensorModule", "lock_stake", lockStakeArgs),
    sapi.getDecodedCall("SubtensorModule", "set_perpetual_lock", {
      netuid,
      enabled: makePerpetual,
    }),
  ]

  return sapi.getExtrinsicPayload("Utility", "batch_all", { calls }, { address })
}
