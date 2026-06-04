import type { ScaleApi } from "@talismn/sapi"
import { Binary } from "polkadot-api"

type GetBittensorConvictionLockPayloadProps = {
  sapi: ScaleApi
  address: string
  hotkey: string
  netuid: number
  amount: bigint
  /** whether the user wants the lock to be perpetual (never decays) */
  makePerpetual: boolean
  /** whether the existing lock is already perpetual (skip the redundant flag flip) */
  isAlreadyPerpetual: boolean
}

/**
 * Builds the extrinsic that creates (or tops up) a conviction lock on a subnet.
 *
 * `SubtensorModule.lock_stake` locks already-staked alpha to a hotkey for governance conviction.
 * It creates a lock if none exists for the (coldkey, netuid), otherwise tops up the existing one
 * (the chain rejects a different hotkey with `LockHotkeyMismatch`). New locks start *decaying*.
 *
 * To make a lock perpetual we batch `set_perpetual_lock(netuid, true)` after `lock_stake` — it flips
 * the (now-existing) lock's decay flag. We skip it when the lock is already perpetual.
 */
export const getBittensorConvictionLockPayload = ({
  sapi,
  address,
  hotkey,
  netuid,
  amount,
  makePerpetual,
  isAlreadyPerpetual,
}: GetBittensorConvictionLockPayloadProps) => {
  const calls = [
    sapi.getDecodedCall("SubtensorModule", "lock_stake", {
      hotkey,
      netuid,
      amount,
    }),
  ]

  if (makePerpetual && !isAlreadyPerpetual) {
    calls.push(
      sapi.getDecodedCall("SubtensorModule", "set_perpetual_lock", {
        netuid,
        enabled: true,
      })
    )
  }

  calls.push(
    sapi.getDecodedCall("System", "remark_with_event", {
      remark: Binary.fromText("talisman-bittensor"),
    })
  )

  return sapi.getExtrinsicPayload("Utility", "batch_all", { calls }, { address })
}
