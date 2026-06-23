import type { ScaleApi } from "@talismn/sapi"

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
 */
export const getBittensorChangeLockTypePayload = ({
  sapi,
  address,
  netuid,
  makePerpetual,
}: GetBittensorChangeLockTypePayloadProps) => {
  return sapi.getExtrinsicPayload(
    "SubtensorModule",
    "set_perpetual_lock",
    {
      netuid,
      enabled: makePerpetual,
    },
    { address }
  )
}
