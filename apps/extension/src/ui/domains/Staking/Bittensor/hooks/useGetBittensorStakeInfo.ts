import { ScaleApi } from "@talismn/sapi"
import { ChainId } from "extension-core"
import { useMemo } from "react"

import { type BalanceDetailRow } from "@ui/domains/Portfolio/AssetDetails/useTokenBalances"

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
  poolId: string | number | null | undefined
  netuid: number | null
  plancks: bigint | null
  chainId: ChainId | undefined
  stakeType: StakeType
  userMaxSlippage: number
  selectedStake: BalanceDetailRow | undefined
  stakeDirection: StakeDirection
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
    poolId,
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
    hotkey: String(poolId),
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
    currentPoolId: hotkeys?.[0] ?? poolId,
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
