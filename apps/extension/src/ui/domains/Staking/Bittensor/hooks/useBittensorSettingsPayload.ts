import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import type { RootClaimType } from "../../hooks/bittensor/dTao/types"
import { getBittensorSettingsPayload } from "../utils/bittensorSettingsTx"

type UseBittensorSettingsPayloadProps = {
  networkId: string | undefined
  address: string | null | undefined
  /** include a set_root_claim_type call (reward type and/or its selected subnets changed) */
  includeClaimSettings: boolean
  claimType: RootClaimType | null
  selectedSubnets?: number[]
  /** include a set_reject_locked_alpha call (accept-locked-alpha toggle changed) */
  includeRejectFlag: boolean
  acceptLockedAlpha: boolean
}

/**
 * Builds the combined "Bittensor settings" payload (reward type + accept-locked-alpha) from only
 * the values that changed, and estimates its fee. Returns no payload when nothing changed.
 */
export const useBittensorSettingsPayload = ({
  networkId,
  address,
  includeClaimSettings,
  claimType,
  selectedSubnets,
  includeRejectFlag,
  acceptLockedAlpha,
}: UseBittensorSettingsPayloadProps) => {
  const { data: sapi, isLoading: isLoadingSapi, isError: isErrorSapi } = useScaleApi(networkId)

  const {
    data: payloadData,
    isPlaceholderData: isPlaceholderPayload,
    isLoading: isLoadingPayload,
    isError: isErrorPayload,
    error: errorPayload,
  } = useQuery({
    queryKey: [
      "useBittensorSettingsPayload",
      sapi?.id,
      address,
      includeClaimSettings,
      claimType,
      selectedSubnets?.join(","),
      includeRejectFlag,
      acceptLockedAlpha,
    ],
    queryFn: () => {
      if (!sapi || !address) return null
      // nothing changed → nothing to submit
      if (!includeClaimSettings && !includeRejectFlag) return null
      // claim type is still loading; don't build a partial payload
      if (includeClaimSettings && !claimType) return null
      return getBittensorSettingsPayload({
        sapi,
        address,
        includeClaimSettings,
        claimType: claimType ?? "Swap",
        selectedSubnets,
        includeRejectFlag,
        acceptLockedAlpha,
      })
    },
    placeholderData: keepPreviousData,
  })

  const {
    data: feeEstimate,
    isLoading: isLoadingFee,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload: payloadData?.payload })

  return {
    // never expose a payload built for previous inputs (keepPreviousData): a fast user could
    // reach the confirm step and sign it while the current one is still building
    payload: isPlaceholderPayload ? undefined : payloadData?.payload,
    txMetadata: isPlaceholderPayload ? undefined : payloadData?.txMetadata,
    feeEstimate,
    isLoadingFeeEstimate: isLoadingSapi || isLoadingFee,
    errorFeeEstimate,
    isLoadingPayload: isLoadingSapi || isLoadingPayload,
    isErrorPayload: isErrorSapi || isErrorPayload,
    errorPayload,
  }
}
