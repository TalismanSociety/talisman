import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getBittensorChangeLockTypePayload } from "../utils/changeLockTypeTx"

type UseBittensorChangeLockTypePayloadProps = {
  networkId: string | undefined
  address: string | null | undefined
  netuid: number | null | undefined
  /** target state: true => perpetual, false => decaying */
  makePerpetual: boolean
  /** false when there is no lock or the target equals the current type (a fee-burning no-op) */
  enabled: boolean
}

export const useBittensorChangeLockTypePayload = ({
  networkId,
  address,
  netuid,
  makePerpetual,
  enabled,
}: UseBittensorChangeLockTypePayloadProps) => {
  const { data: sapi, isLoading: isLoadingSapi, isError: isErrorSapi } = useScaleApi(networkId)

  // set_perpetual_lock is amount-independent: a single payload query serves both
  // the submission and the fee estimate
  const {
    data: payloadData,
    isLoading: isLoadingPayload,
    isError: isErrorPayload,
    error: errorPayload,
  } = useQuery({
    queryKey: [
      "useBittensorChangeLockTypePayload",
      sapi?.id,
      address,
      netuid,
      makePerpetual,
      enabled,
    ],
    queryFn: () => {
      if (!enabled || !sapi || !address || typeof netuid !== "number") return null
      return getBittensorChangeLockTypePayload({ sapi, address, netuid, makePerpetual })
    },
    placeholderData: keepPreviousData,
  })

  const {
    data: feeEstimate,
    isLoading: isLoadingFee,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload: payloadData?.payload })

  return {
    payload: payloadData?.payload,
    txMetadata: payloadData?.txMetadata,
    feeEstimate,
    isLoadingFeeEstimate: isLoadingSapi || isLoadingFee,
    errorFeeEstimate,
    isLoadingPayload: isLoadingSapi || isLoadingPayload,
    isErrorPayload: isErrorSapi || isErrorPayload,
    errorPayload,
  }
}
