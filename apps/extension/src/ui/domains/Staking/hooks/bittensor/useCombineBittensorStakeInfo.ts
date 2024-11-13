import { getLockTitle } from "@talismn/balances"
import { formatTokenDecimals } from "@talismn/util"
import BigNumber from "bignumber.js"
import { useMemo } from "react"

import { Balances } from "@extension/core"
import { DetailRow } from "@ui/domains/Portfolio/AssetDetails/useChainTokenBalances"
import { useSelectedCurrency, useToken, useTokenRates } from "@ui/state"

import { useGetBittensorStakeInfo } from "./useGetBittensorStakeInfo"
import { useGetBittensorValidators } from "./useGetBittensorValidator"

type CombineBittensorStakeInfo = {
  address: string | undefined
  balances: Balances
}

export const useCombineBittensorStakeInfo = ({ address, balances }: CombineBittensorStakeInfo) => {
  const tokenId = "bittensor-substrate-native"
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)
  const selectedCurrency = useSelectedCurrency()

  const totalStaked = balances.each.reduce((acc, b) => {
    return acc + b.subtensor.reduce((acc, subtensor) => acc + Number(subtensor.amount.tokens), 0)
  }, 0)

  const { data: stakeInfo, isLoading: isStakeInfoLoading } = useGetBittensorStakeInfo({
    address,
    totalStaked,
  })

  const hotkeys = useMemo(() => stakeInfo?.map((stake) => stake.delegate.ss58), [stakeInfo])

  const { data: validators, isLoading: isBittensorValidatorLoading } = useGetBittensorValidators({
    hotkeys: hotkeys ?? [],
  })

  const combinedStakeInfo: DetailRow[] = useMemo(() => {
    if ((totalStaked > 0 && isStakeInfoLoading) || !stakeInfo) {
      return [
        {
          key: "test",
          title: getLockTitle({ label: "subtensor-staking" }),
          description: undefined,
          tokens: BigNumber(totalStaked),
          fiat: null,
          locked: true,
          address: undefined,
          meta: null,
          isLoading: isBittensorValidatorLoading || isStakeInfoLoading,
        },
      ]
    }

    const stakeInfos = stakeInfo.map((stake, index) => {
      const validator = validators[index]
      const formattedStakedAmount = formatTokenDecimals(stake.balance, token?.decimals ?? 9)

      return {
        key: `${stake.delegate.ss58}-subtensor-${index}`,
        title: getLockTitle({ label: "subtensor-staking" }),
        description: validator?.name,
        tokens: BigNumber(formattedStakedAmount),
        fiat: formattedStakedAmount * (tokenRates?.[selectedCurrency] ?? 0),
        locked: true,
        address: undefined,
        meta: stake,
        isLoading: isBittensorValidatorLoading,
      }
    })

    return stakeInfos
  }, [
    totalStaked,
    isStakeInfoLoading,
    stakeInfo,
    isBittensorValidatorLoading,
    validators,
    token?.decimals,
    tokenRates,
    selectedCurrency,
  ])

  return { combinedStakeInfo }
}
