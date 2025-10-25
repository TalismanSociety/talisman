import { DotNetworkId } from "@talismn/chaindata-provider"
import { ScaleApi } from "@talismn/sapi"
import { useMemo } from "react"

import { useGetBittensorMinJoinBond } from "../../hooks/bittensor/useGetBittensorMinJoinBond"
import { useGetBittensorStakeHotkeys } from "../../hooks/bittensor/useGetBittensorStakeHotkeys"
import { useGetBittensorStakingPayload } from "../../hooks/bittensor/useGetBittensorStakingPayload"
import { useGetBittensorUnbondPayload } from "../../hooks/bittensor/useGetBittensorUnbondPayload"
import { useGetFeeEstimate } from "../../shared/useGetFeeEstimate"
import { type StakeDirection, type StakeType } from "./useBittensorBondWizard"
import { useGetDynamicTaoStakeInfo } from "./useGetDynamicTaoStakeInfo"

type GetStakeInfo = {
  sapi: ScaleApi | undefined | null
  address: string | null
  hotkey: string | null | undefined
  netuid: number | null
  plancks: bigint | null
  chainId: DotNetworkId | undefined
  stakeType: StakeType
  userMaxSlippage: number
  stakeDirection: StakeDirection
}

export const useGetBittensorStakeInfo = ({
  sapi,
  address,
  hotkey,
  netuid,
  plancks,
  chainId,
  stakeType,
  userMaxSlippage,
  stakeDirection,
}: GetStakeInfo) => {
  const { data: minJoinBond } = useGetBittensorMinJoinBond({ chainId, stakeType })

  const {
    slippage,
    talismanFee,
    taoToAlphaConversionRate,
    expectedAlphaWithSlippage,
    expectedTaoWithSlippage,
    alphaPriceWithSlippage,
    taoAmountFromAlpha,
    minAlphaUnstake,
    isLoading: isDynamicInfoLoading,
    isError: isDynamicInfoError,
  } = useGetDynamicTaoStakeInfo({
    netuid,
    amount: plancks,
    direction: stakeDirection === "bond" ? "taoToAlpha" : "alphaToTao",
    userMaxSlippage,
    minJoinBond,
  })

  const bittensorStakingPayload = useGetBittensorStakingPayload({
    sapi,
    address,
    hotkey,
    plancks,
    minJoinBond,
    isEnabled: stakeDirection === "bond",
    stakeType,
    alphaPriceWithSlippage,
    netuid,
    talismanFee: talismanFee,
  })

  const bittensorUnbondPayload = useGetBittensorUnbondPayload({
    sapi,
    address,
    hotkey,
    isEnabled: stakeDirection === "unbond",
    plancks,
    stakeType,
    alphaPriceWithSlippage,
    talismanFee,
    netuid,
  })

  const hotkeys = useGetBittensorStakeHotkeys({ address, chainId })

  const stakeActionPayload = useMemo(
    () => (stakeDirection === "bond" ? bittensorStakingPayload : bittensorUnbondPayload),
    [bittensorStakingPayload, bittensorUnbondPayload, stakeDirection],
  )

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = stakeActionPayload

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
    currentHotkey: hotkeys?.[0] ?? hotkey,
    minJoinBond,
    minAlphaUnstake,

    slippage,
    talismanFee,
    taoToAlphaConversionRate,
    taoAmountFromAlpha,
    expectedAlphaWithSlippage,
    expectedTaoWithSlippage,
    isDynamicInfoLoading,
    isDynamicInfoError,
  }
}
