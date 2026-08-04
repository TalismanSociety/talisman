import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getBittensorClaimPayload } from "../utils/bittensorClaimTx"

type UseBittensorClaimPayloadProps = {
  networkId: string | undefined
  address: string | null | undefined
  /** validator whose basket entitlement to claim */
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
    queryKey: ["useBittensorClaimPayload", sapi?.id, address, hotkey],
    queryFn: () => {
      if (!sapi || !address || !hotkey) return null
      return getBittensorClaimPayload({ sapi, address, hotkey })
    },
    // an option rather than a key member: a disabled run would otherwise cache a null payload
    // under its own key, which the enabled transition then starts from
    enabled: enabled && !!sapi && !!address && !!hotkey,
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
