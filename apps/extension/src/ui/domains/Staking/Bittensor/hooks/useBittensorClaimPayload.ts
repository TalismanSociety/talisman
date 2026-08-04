import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getBittensorClaimPayload } from "../utils/bittensorClaimTx"

type UseBittensorClaimPayloadProps = {
  networkId: string | undefined
  address: string | null | undefined
  /** validator whose basket entitlement to claim; null claims across every validator */
  hotkey: string | null
  /** only build the payload when the claim can actually be submitted */
  enabled: boolean
}

/** Builds the root rewards claim payload (spec 441) and estimates its fee */
export const useBittensorClaimPayload = ({
  networkId,
  address,
  hotkey,
  enabled,
}: UseBittensorClaimPayloadProps) => {
  const { data: sapi, isLoading: isLoadingSapi, isError: isErrorSapi } = useScaleApi(networkId)

  const {
    data: payloadData,
    isPlaceholderData: isPlaceholderPayload,
    isLoading: isLoadingPayload,
    isError: isErrorPayload,
    error: errorPayload,
  } = useQuery({
    queryKey: ["useBittensorClaimPayload", sapi?.id, address, hotkey, enabled],
    queryFn: () => {
      if (!sapi || !address || !hotkey || !enabled) return null
      return getBittensorClaimPayload({ sapi, address, hotkey })
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
