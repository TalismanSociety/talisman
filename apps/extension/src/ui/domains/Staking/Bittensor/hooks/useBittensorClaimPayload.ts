import { ERA_PERIOD } from "@talismn/sapi"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useMemo } from "react"

import { getBittensorClaimPayload } from "../utils/bittensorClaimTx"
import { getBlockTimeMs } from "../utils/helpers"

// rebuild the payload well within its mortal era so a claim confirmed after the modal sat
// open for a while is not rejected as expired
const PAYLOAD_REFRESH_BLOCKS = ERA_PERIOD / 4
// a rebuild can be late (tab suspended, rebuild failed): past this age the payload is
// withheld until a fresh one lands rather than handed to the user to sign
const PAYLOAD_MAX_AGE_BLOCKS = ERA_PERIOD / 2

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
  const blockTimeMs = useMemo(() => (sapi ? getBlockTimeMs(sapi) : null), [sapi])

  const {
    data: payloadData,
    dataUpdatedAt: payloadUpdatedAt,
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
    refetchInterval: blockTimeMs ? blockTimeMs * PAYLOAD_REFRESH_BLOCKS : false,
    // the interval only ticks in a focused tab by default: the modal left open in a
    // background tab is exactly the case the rebuild exists for
    refetchIntervalInBackground: true,
  })

  const {
    data: feeEstimate,
    isLoading: isLoadingFee,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload: payloadData?.payload })

  const isPayloadExpired =
    !!blockTimeMs &&
    !!payloadData &&
    Date.now() - payloadUpdatedAt > blockTimeMs * PAYLOAD_MAX_AGE_BLOCKS
  // never expose a payload built for previous inputs (keepPreviousData) or one that may
  // sit outside its mortal era: a fast user could reach the confirm step and sign it while
  // the current one is still building
  const isPayloadCurrent = !isPlaceholderPayload && !isPayloadExpired

  return {
    payload: isPayloadCurrent ? payloadData?.payload : undefined,
    txMetadata: isPayloadCurrent ? payloadData?.txMetadata : undefined,
    feeEstimate,
    isLoadingFeeEstimate: isLoadingSapi || isLoadingFee,
    errorFeeEstimate,
    isLoadingPayload: isLoadingSapi || isLoadingPayload || isPayloadExpired,
    isErrorPayload: isErrorSapi || isErrorPayload,
    errorPayload,
  }
}
