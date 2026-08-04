import type { ScaleApi } from "@talismn/sapi"

type GetBittensorClaimPayloadProps = {
  sapi: ScaleApi
  address: string
  /** validator whose basket entitlement to claim */
  hotkey: string
}

/**
 * Builds the root rewards claim extrinsic (spec 441): `claim_root_with_hotkey` redeems the
 * coldkey's accrued entitlement on one validator's basket. Claimed TAO is staked back onto
 * the root network, it is not paid out as free balance.
 */
export const getBittensorClaimPayload = ({
  sapi,
  address,
  hotkey,
}: GetBittensorClaimPayloadProps) =>
  sapi.getExtrinsicPayload("SubtensorModule", "claim_root_with_hotkey", { hotkey }, { address })
