import type { ScaleApi } from "@talismn/sapi"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { getBittensorConvictionLockPayload } from "../utils/convictionLockTx"

type UseConvictionLockPayloadQueryProps = {
  sapi: ScaleApi | null | undefined
  address: string | null | undefined
  hotkey: string | null | undefined
  netuid: number | null | undefined
  amount: bigint | null | undefined
  makePerpetual: boolean
  currentIsPerpetual: boolean | null | undefined
}

const useConvictionLockPayloadQuery = ({
  sapi,
  address,
  hotkey,
  netuid,
  amount,
  makePerpetual,
  currentIsPerpetual,
}: UseConvictionLockPayloadQueryProps) =>
  useQuery({
    queryKey: [
      "useBittensorConvictionLockPayload",
      sapi?.id,
      address,
      hotkey,
      netuid,
      amount?.toString(),
      makePerpetual,
      currentIsPerpetual,
    ],
    queryFn: () => {
      if (
        !sapi ||
        !address ||
        !hotkey ||
        typeof netuid !== "number" ||
        typeof amount !== "bigint" ||
        amount <= 0n ||
        typeof currentIsPerpetual !== "boolean"
      )
        return null
      return getBittensorConvictionLockPayload({
        sapi,
        address,
        hotkey,
        netuid,
        amount,
        makePerpetual,
        currentIsPerpetual,
      })
    },
    placeholderData: keepPreviousData,
  })

type UseBittensorConvictionLockPayloadProps = {
  networkId: string | undefined
  address: string | null | undefined
  hotkey: string | null | undefined
  netuid: number | null | undefined
  amount: bigint | null | undefined
  makePerpetual: boolean
  currentIsPerpetual: boolean | null | undefined
  /** stable nominal amount used to estimate the fee before/at amount entry (eg max lockable) */
  feeAmount: bigint | null | undefined
}

export const useBittensorConvictionLockPayload = ({
  networkId,
  address,
  hotkey,
  netuid,
  amount,
  makePerpetual,
  currentIsPerpetual,
  feeAmount,
}: UseBittensorConvictionLockPayloadProps) => {
  const { data: sapi, isLoading: isLoadingSapi, isError: isErrorSapi } = useScaleApi(networkId)

  const {
    data: payloadData,
    isPlaceholderData: isPlaceholderPayload,
    isLoading: isLoadingPayload,
    isError: isErrorPayload,
    error: errorPayload,
  } = useConvictionLockPayloadQuery({
    sapi,
    address,
    hotkey,
    netuid,
    amount,
    makePerpetual,
    currentIsPerpetual,
  })

  // the lock_stake fee is amount-independent: estimate with a stable nominal amount so the fee
  // renders before the user has typed (or while the typed amount is still invalid)
  const nominalAmount =
    typeof amount === "bigint" && amount > 0n
      ? amount
      : typeof feeAmount === "bigint" && feeAmount > 0n
        ? feeAmount
        : 1n

  const { data: feePayloadData } = useConvictionLockPayloadQuery({
    sapi,
    address,
    hotkey,
    netuid,
    amount: nominalAmount,
    makePerpetual,
    currentIsPerpetual,
  })

  const {
    data: feeEstimate,
    isLoading: isLoadingFee,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload: feePayloadData?.payload })

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
