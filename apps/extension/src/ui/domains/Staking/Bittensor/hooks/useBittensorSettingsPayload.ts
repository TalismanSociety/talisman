import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getBittensorSettingsPayload } from "../utils/bittensorSettingsTx"

type UseBittensorSettingsPayloadProps = {
  networkId: string | undefined
  address: string | null | undefined
  /** include a set_reject_locked_alpha call (the accept-locked-alpha toggle changed) */
  includeRejectFlag: boolean
  acceptLockedAlpha: boolean
}

/**
 * Builds the "Bittensor settings" payload (accept-locked-alpha) when the toggle changed, and
 * estimates its fee. Returns no payload when nothing changed.
 */
export const useBittensorSettingsPayload = ({
  networkId,
  address,
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
      includeRejectFlag,
      acceptLockedAlpha,
    ],
    queryFn: () => {
      if (!sapi || !address) return null
      // nothing changed → nothing to submit
      if (!includeRejectFlag) return null
      return getBittensorSettingsPayload({ sapi, address, acceptLockedAlpha })
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
