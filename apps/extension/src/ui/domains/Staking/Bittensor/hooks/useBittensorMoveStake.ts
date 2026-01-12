import { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getBittensorMoveStakePayload } from "../utils/helpers"

// Valid SS58 address used as placeholder for fee estimation before user selects a destination validator
const MOCKED_HOTKEY = "5HK5tp6t2S59DywmHRWPBVJeJ86T61KjurYqeooqj8sREpeN"

type UseBittensorMoveStakeProps = {
  networkId: string | null | undefined
  address: string | null
  originHotkey: string | null | undefined
  destinationHotkey: string | null | undefined
  netuid: number | null
  alphaAmount: bigint | null
}

/**
 * Hook to generate the payload for moving stake from one validator to another.
 * This is used for the "Change Validator" feature where a user wants to move
 * their staked amount from one hotkey to another within the same subnet.
 */
export const useBittensorMoveStake = ({
  networkId,
  address,
  originHotkey,
  destinationHotkey,
  netuid,
  alphaAmount,
}: UseBittensorMoveStakeProps) => {
  const { data: sapi, isLoading: isLoadingSapi, isError: isErrorSapi } = useScaleApi(networkId)

  const {
    data: moveStakePayload,
    isLoading: isLoadingPayload,
    isError: isErrorPayload,
    error: errorPayload,
  } = useBittensorMoveStakePayload({
    sapi,
    address,
    originHotkey,
    destinationHotkey,
    netuid,
    alphaAmount,
  })

  // Generate fee estimate payload once position is selected (originHotkey and alphaAmount available)
  const { data: feeEstimatePayload, isLoading: isLoadingFeeEstimatePayload } =
    useBittensorMoveStakePayload({
      sapi,
      address,
      originHotkey,
      destinationHotkey: destinationHotkey ?? MOCKED_HOTKEY,
      netuid,
      alphaAmount,
    })

  return {
    isLoading: isLoadingSapi || isLoadingPayload || isLoadingFeeEstimatePayload,
    isError: isErrorSapi || isErrorPayload,
    errorPayload,
    payload: moveStakePayload?.payload,
    txMetadata: moveStakePayload?.txMetadata,
    feeEstimatePayload: feeEstimatePayload?.payload,
  }
}

type UseBittensorMoveStakePayloadProps = {
  sapi: ScaleApi | undefined | null
  address: string | null
  originHotkey: string | null | undefined
  destinationHotkey: string | null | undefined
  netuid: number | null
  alphaAmount: bigint | null | undefined
}

const useBittensorMoveStakePayload = ({
  sapi,
  address,
  originHotkey,
  destinationHotkey,
  netuid,
  alphaAmount,
}: UseBittensorMoveStakePayloadProps) => {
  return useQuery({
    queryKey: [
      "useBittensorMoveStakePayload",
      sapi?.id,
      address,
      originHotkey,
      destinationHotkey,
      netuid,
      alphaAmount?.toString(),
    ],
    queryFn: () => {
      if (
        !sapi ||
        !address ||
        !originHotkey ||
        !destinationHotkey ||
        typeof alphaAmount !== "bigint" ||
        typeof netuid !== "number"
      )
        return null

      // For changing validator within the same subnet, origin and destination netuid are the same
      return getBittensorMoveStakePayload({
        sapi,
        address,
        originHotkey,
        destinationHotkey,
        originNetuid: netuid,
        destinationNetuid: netuid,
        alphaAmount,
      })
    },
  })
}
