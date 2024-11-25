import { ChainId } from "extension-core"

import { ScaleApi } from "@ui/util/scaleApi"

import { useCanStakeBittensor } from "../hooks/bittensor/useCanStakeBittensor"
import { useGetBittensorStakeByHotKey } from "../hooks/bittensor/useGetBittensorStakeByHotKey"
import { useGetBittensorUnbondPayload } from "../hooks/bittensor/useGetBittensorUnbondPayload"
import { useUpsertBittensorUnbondBlockNumber } from "../hooks/bittensor/useUpsertBittensorUnbondBlockNumber"
import { useGetNomPoolPlanksToUnbond } from "../hooks/nomPools/useGetNomPoolPlanksToUnbond"
import { useGetNomPoolUnbondPayload } from "../hooks/nomPools/useGetNomPoolUnbondPayload"
import { useNomPoolByMember } from "../hooks/nomPools/useNomPoolByMember"
import { useGetFeeEstimate } from "./useGetFeeEstimate"

type GetUnbondInfo = {
  sapi: ScaleApi | undefined | null
  chainId: ChainId | undefined
  address: string | undefined
  unstakePoolId: number | string | undefined
}

type UnbondType = "bittensor" | "nomPools"

export const useGetUnbondInfo = ({ sapi, chainId, address, unstakePoolId }: GetUnbondInfo) => {
  const { data: pool } = useNomPoolByMember(chainId, address)
  const { data: nomPoolPlanksToUnbond } = useGetNomPoolPlanksToUnbond({
    sapi,
    pool,
    isEnabled: chainId !== "bittensor",
  })
  const nomPoolUnbondPayload = useGetNomPoolUnbondPayload({
    sapi,
    address,
    pool,
    isEnabled: chainId !== "bittensor",
  })

  const { data: bittensorPlanks } = useGetBittensorStakeByHotKey({
    address,
    hotkey: unstakePoolId,
  })

  const bittensorUnbondPayload = useGetBittensorUnbondPayload({
    sapi,
    address,
    hotkey: unstakePoolId,
    isEnabled: chainId === "bittensor",
    plancks: bittensorPlanks,
  })

  const { mutate: upsertBittensorUnbondBlockNumber } = useUpsertBittensorUnbondBlockNumber()

  const handleBittensorUnbondSuccess = (blockNumber: number) => {
    upsertBittensorUnbondBlockNumber({
      account: address,
      delegator: unstakePoolId,
      blockNumber,
    })
  }

  let payloadInfo
  let plancksToUnbond
  let poolId
  let unbondType: UnbondType

  switch (chainId) {
    case "bittensor":
      payloadInfo = bittensorUnbondPayload
      plancksToUnbond = bittensorPlanks
      poolId = unstakePoolId
      unbondType = "bittensor"
      break
    default:
      payloadInfo = nomPoolUnbondPayload
      plancksToUnbond = nomPoolPlanksToUnbond
      poolId = pool?.pool_id
      unbondType = "bittensor"
      break
  }

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = payloadInfo || {}

  const { payload, txMetadata } = payloadAndMetadata || {}

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload })

  const { canStake, isLoading: isCanStakeLoading } = useCanStakeBittensor({
    sapi,
    address,
    hotkey: poolId,
    chainId,
  })

  return {
    plancksToUnbond,
    pool,
    poolId,
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    unbondType,
    canStake,
    isCanStakeLoading,
    handleSuccess: chainId === "bittensor" ? handleBittensorUnbondSuccess : () => {},
  }
}
