import { ScaleApi } from "@talismn/sapi"
import { ChainId } from "extension-core"

import { useGetBittensorStakeHotkeys } from "../../hooks/bittensor/useGetBittensorStakeHotkeys"
import { useGetBittensorStakingPayload } from "../../hooks/bittensor/useGetBittensorStakingPayload"
import { useGetFeeEstimate } from "../../shared/useGetFeeEstimate"
import { useGetMinJoinBond } from "../../shared/useGetMinJoinBond"
import { type StakeType } from "./useBittensorBondWizard"
import { useGetDynamicTaoStakeInfo } from "./useGetDynamicTaoStakeInfo"

type GetStakeInfo = {
  sapi: ScaleApi | undefined | null
  address: string | null
  poolId: string | number | null | undefined
  netuid: number | null
  plancks: bigint | null
  chainId: ChainId | undefined
  stakeType: StakeType
  userMaxSlippage: number
}

export const useGetBittensorStakeInfo = ({
  sapi,
  address,
  poolId,
  netuid,
  plancks,
  chainId,
  stakeType,
  userMaxSlippage,
}: GetStakeInfo) => {
  const {
    taoToAlphaSlippage,
    taoToAlphaTalismanFee,
    taoToAlphaConversionRate,
    expectedAlphaWithSlippage,
    alphaPriceWithSlippage,
    isLoading: isDynamicInfoLoading,
    isError: isDynamicInfoError,
  } = useGetDynamicTaoStakeInfo({
    netuid,
    amount: plancks,
    direction: "taoToAlpha",
    userMaxSlippage,
  })
  const { data: minJoinBond } = useGetMinJoinBond(chainId)

  const bittensorStakingPayload = useGetBittensorStakingPayload({
    sapi,
    address,
    poolId,
    plancks,
    minJoinBond,
    isEnabled: true,
    stakeType,
    alphaPriceWithSlippage,
    netuid,
    talismanFee: taoToAlphaTalismanFee,
  })

  const hotkeys = useGetBittensorStakeHotkeys({ address, chainId })

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = bittensorStakingPayload

  const { payload, txMetadata } = payloadAndMetadata || {}

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload })

  return {
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    currentPoolId: hotkeys?.[0] ?? poolId,
    minJoinBond,

    taoToAlphaSlippage,
    taoToAlphaTalismanFee,
    taoToAlphaConversionRate,
    expectedAlphaWithSlippage,
    isDynamicInfoLoading,
    isDynamicInfoError,
  }
}
