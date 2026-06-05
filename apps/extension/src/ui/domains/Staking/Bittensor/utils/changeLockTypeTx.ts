import type { ScaleApi } from "@talismn/sapi"
import { Binary } from "polkadot-api"

type GetBittensorChangeLockTypePayloadProps = {
  sapi: ScaleApi
  address: string
  netuid: number
  /** target state: true => perpetual (freeze decay), false => decaying (resume decay) */
  makePerpetual: boolean
}

/**
 * Builds the extrinsic that toggles an EXISTING conviction lock between decaying and perpetual.
 *
 * `SubtensorModule.set_perpetual_lock(netuid, enabled)` flips the decay flag of the caller's lock
 * on a subnet: `true` freezes the locked amount (conviction matures toward it), `false` resumes
 * the exponential decay (~90-day half-life). It is signed by the coldkey, valid in both
 * directions and reversible anytime — calling it with `false` is the only way out of a
 * perpetual lock.
 *
 * Wrapped in `Utility.batch_all` with a trailing `System.remark_with_event` to preserve the
 * `talisman-bittensor` tx-tagging convention used by all our Bittensor transactions.
 */
export const getBittensorChangeLockTypePayload = ({
  sapi,
  address,
  netuid,
  makePerpetual,
}: GetBittensorChangeLockTypePayloadProps) => {
  const calls = [
    sapi.getDecodedCall("SubtensorModule", "set_perpetual_lock", {
      netuid,
      enabled: makePerpetual,
    }),
    sapi.getDecodedCall("System", "remark_with_event", {
      remark: Binary.fromText("talisman-bittensor"),
    }),
  ]

  return sapi.getExtrinsicPayload("Utility", "batch_all", { calls }, { address })
}
