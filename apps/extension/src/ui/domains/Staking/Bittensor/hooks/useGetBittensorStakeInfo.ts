import type { DotNetworkId } from "@talismn/chaindata-provider"
import type { ScaleApi } from "@talismn/sapi"

import { useBittensorCurrentHotkey } from "../../hooks/bittensor/useGetBittensorStakeHotkeys"
import { useGetFeeEstimate } from "../../shared/useGetFeeEstimate"
import type { StakeDirection } from "./useBittensorBondWizard"
import { useBittensorStakingPayload } from "./useBittensorStakingPayload"

type GetStakeInfo = {
  sapi: ScaleApi | undefined | null
  address: string | null
  hotkey: string | null | undefined
  netuid: number | null
  amountIn: bigint | null
  networkId: DotNetworkId | undefined
  stakeDirection: StakeDirection
  withClaim?: boolean
}

export const useGetBittensorStakeInfo = ({
  sapi,
  address,
  hotkey,
  netuid,
  amountIn,
  networkId,
  stakeDirection,
  withClaim,
}: GetStakeInfo) => {
  const {
    alphaPrice,
    payload,
    feeEstimatePayload,
    txMetadata,
    minTaoBond,
    minTaoBondForInput,
    minAlphaBond,
    minTaoStake,
    minTaoStakeForInput,
    minAlphaUnstake,
    amountOut,
    talismanFee,
    errorPayload,
    swapPrice,
    priceImpact,
    isLoading: isLoadingPayload,
    slippage,
  } = useBittensorStakingPayload({
    netuid,
    amountIn,
    direction: stakeDirection === "bond" ? "taoToAlpha" : "alphaToTao",
    hotkey,
    address,
    networkId,
    remarkType: "stake",
    withClaim,
  })

  const currentHotkey = useBittensorCurrentHotkey({ address, networkId, netuid })

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload: feeEstimatePayload })

  return {
    alphaPrice,
    swapPrice,
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    currentHotkey,
    minTaoBond,
    minTaoBondForInput,
    minAlphaBond,
    minTaoStake,
    minTaoStakeForInput,
    minAlphaUnstake,
    priceImpact,
    talismanFee,
    amountOut,
    slippage,
  }
}
