import { ChainId } from "extension-core"
import { useEffect, useState } from "react"

import { ScaleApi } from "@ui/util/scaleApi"

import { useGetBittensorTotalHotkeyColdkeyStakes } from "./useGetBittensorTotalHotkeyColdkeyStakes"
import { useGetLatestBlockNumber } from "./useGetLatestBlockNumber"

const STAKE_INTERVAL_BLOCKS = 360

type CanStakeBittensor = {
  sapi: ScaleApi | undefined | null
  address: string | null | undefined
  hotkey: string | number | undefined
  chainId: ChainId | undefined
}

export const useCanStakeBittensor = ({ sapi, address, hotkey, chainId }: CanStakeBittensor) => {
  const [canStake, setCanStake] = useState<boolean>(true)
  const { data: blockNumber, isLoading: isBlockNumberLoading } = useGetLatestBlockNumber({
    sapi,
    isEnabled: chainId === "bittensor",
  })
  const { data: stakeData, isLoading: isStakeDataLoading } =
    useGetBittensorTotalHotkeyColdkeyStakes({
      isEnabled: chainId === "bittensor",
      sapi,
      address: address,
      hotkey: hotkey,
    })

  const [, lastStakedBlockNumber] = stakeData || [0n, 0n]

  useEffect(() => {
    if (lastStakedBlockNumber && blockNumber) {
      const coolDownBlockNumber = Number(lastStakedBlockNumber) + STAKE_INTERVAL_BLOCKS
      if (coolDownBlockNumber > blockNumber) {
        setCanStake(false)
      }
    }
  }, [blockNumber, lastStakedBlockNumber])

  return { canStake, isLoading: isBlockNumberLoading || isStakeDataLoading }
}
