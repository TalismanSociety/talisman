import { ChainId } from "extension-core"
import { useEffect, useMemo, useState } from "react"

import { ScaleApi } from "@ui/util/scaleApi"

import { useGetLatestBlockNumber } from "../../shared/useGetLatestBlockNumber"
import { useGetBittensorTotalHotkeyColdkeyStakes } from "./useGetBittensorTotalHotkeyColdkeyStakes"
import { useGetBittensorUnbondBlockNumber } from "./useGetBittensorUnbondBlockNumber"

const STAKE_INTERVAL_BLOCKS = 360

type CanStakeBittensor = {
  sapi: ScaleApi | undefined | null
  address: string | null | undefined
  hotkey: string | number | undefined | null
  chainId: ChainId | undefined
}

export const useCanStakeBittensor = ({ sapi, address, hotkey, chainId }: CanStakeBittensor) => {
  const [canStake, setCanStake] = useState<boolean>(true)

  const { data: blockNumber, isLoading: isBlockNumberLoading } = useGetLatestBlockNumber({
    sapi,
    isEnabled: chainId === "bittensor",
  })

  const { data: unbondBlockNumber } = useGetBittensorUnbondBlockNumber({
    address,
    delegator: hotkey,
  })

  const { data: stakeData, isLoading: isStakeDataLoading } =
    useGetBittensorTotalHotkeyColdkeyStakes({
      isEnabled: chainId === "bittensor",
      sapi,
      address: address,
      hotkey: hotkey,
    })

  const [, lastStakedBlockNumber] = useMemo(() => stakeData ?? [0n, 0n], [stakeData])

  useEffect(() => {
    if (chainId !== "bittensor") return
    const latestActionBlock = Math.max(
      Number(unbondBlockNumber ?? 0),
      Number(lastStakedBlockNumber ?? 0),
    )
    const coolDownBlockNumber = Number(latestActionBlock) + STAKE_INTERVAL_BLOCKS

    if (blockNumber && coolDownBlockNumber > blockNumber) {
      setCanStake(false)
    } else {
      // Handles the case were is user is switching between accounts where both accounts have staked but one account has a cooldown and the other does not
      setCanStake(true)
    }
  }, [blockNumber, lastStakedBlockNumber, address, chainId, unbondBlockNumber])

  return { canStake, isLoading: isBlockNumberLoading || isStakeDataLoading }
}
