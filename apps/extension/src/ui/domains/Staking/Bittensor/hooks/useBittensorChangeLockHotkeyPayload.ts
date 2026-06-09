import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getBittensorChangeLockHotkeyPayload } from "../utils/changeLockHotkeyTx"

type UseBittensorChangeLockHotkeyPayloadProps = {
  networkId: string | undefined
  address: string | null | undefined
  netuid: number | null | undefined
  /** the hotkey to re-point the lock to */
  destinationHotkey: string | null | undefined
  /** false when there is no lock or the target hotkey equals the current one (a fee-burning no-op) */
  enabled: boolean
}

export const useBittensorChangeLockHotkeyPayload = ({
  networkId,
  address,
  netuid,
  destinationHotkey,
  enabled,
}: UseBittensorChangeLockHotkeyPayloadProps) => {
  const { data: sapi, isLoading: isLoadingSapi, isError: isErrorSapi } = useScaleApi(networkId)

  // move_lock is amount-independent: a single payload query serves both the submission and the
  // fee estimate
  const {
    data: payloadData,
    isLoading: isLoadingPayload,
    isError: isErrorPayload,
    error: errorPayload,
  } = useQuery({
    queryKey: [
      "useBittensorChangeLockHotkeyPayload",
      sapi?.id,
      address,
      netuid,
      destinationHotkey,
      enabled,
    ],
    queryFn: () => {
      if (!enabled || !sapi || !address || typeof netuid !== "number" || !destinationHotkey)
        return null
      return getBittensorChangeLockHotkeyPayload({ sapi, address, netuid, destinationHotkey })
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
