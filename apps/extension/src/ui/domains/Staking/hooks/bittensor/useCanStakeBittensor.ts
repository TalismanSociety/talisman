import { ChainId } from "extension-core"
import { useEffect, useState } from "react"

import { ScaleApi } from "@ui/util/scaleApi"

import { useGetLatestBlockNumber } from "../../shared/useGetLatestBlockNumber"
import { useGetBittensorTotalHotkeyColdkeyStakes } from "./useGetBittensorTotalHotkeyColdkeyStakes"

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
      } else {
        // Handles the case were is user is switching between accounts where both accounts have staked but one account has a cooldown and the other does not
        setCanStake(true)
      }
    }
  }, [blockNumber, lastStakedBlockNumber])

  return { canStake, isLoading: isBlockNumberLoading || isStakeDataLoading }
}
