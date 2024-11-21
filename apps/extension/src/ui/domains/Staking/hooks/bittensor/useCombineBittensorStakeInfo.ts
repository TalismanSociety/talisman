import { getLockTitle } from "@talismn/balances"
import { planckToTokens } from "@talismn/util"
import BigNumber from "bignumber.js"
import { useMemo } from "react"

import { Balances } from "@extension/core"
import { DetailRow } from "@ui/domains/Portfolio/AssetDetails/useChainTokenBalances"
import { useTokenBalancesSummary } from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useSelectedCurrency, useTokenRates } from "@ui/state"

import { useGetBittensorStakesByHotKeys } from "./useGetBittensorStakeByHotKey"
import { useGetBittensorStakesHotkeys } from "./useGetBittensorStakeHotkeys"
import { useGetBittensorValidators } from "./useGetBittensorValidator"

type CombineBittensorStakeInfo = {
  address: string | undefined
  balances: Balances
}

export const useCombineBittensorStakeInfo = ({ address, balances }: CombineBittensorStakeInfo) => {
  const { token } = useTokenBalancesSummary(balances)
  const bittensorTokenId = "bittensor-substrate-native"
  const tokenRates = useTokenRates(token?.id)
  const selectedCurrency = useSelectedCurrency()

  const totalStaked = useMemo(() => {
    if (token?.id !== bittensorTokenId) return 0
    return balances.each.reduce((acc, b) => {
      return acc + b.subtensor.reduce((acc, subtensor) => acc + Number(subtensor.amount.tokens), 0)
    }, 0)
  }, [balances.each, token?.id])

  const addresses = useMemo(
    () => (address ? [address] : balances.each.map((b) => b.address)),
    [address, balances.each],
  )

  const { data: hotkeys } = useGetBittensorStakesHotkeys({
    chainId: token?.id === bittensorTokenId ? "bittensor" : "",
    addresses: addresses,
    totalStaked,
  })

  const flatHotkeys = useMemo(() => hotkeys?.flat(), [hotkeys])

  const { data: stakes, isLoading: isStakesLoading } = useGetBittensorStakesByHotKeys({
    addresses,
    hotkeys: hotkeys,
    isEnabled: hotkeys?.length > 0 && totalStaked > 0,
  })

  const { data: validators, isLoading: isBittensorValidatorLoading } = useGetBittensorValidators({
    hotkeys: flatHotkeys ?? [],
    isEnabled: flatHotkeys?.length > 0 && totalStaked > 0,
  })

  const combinedStakeInfo: DetailRow[] = useMemo(() => {
    if (
      (totalStaked > 0 && flatHotkeys?.length && isBittensorValidatorLoading) ||
      isStakesLoading
    ) {
      return [
        {
          key: "loading-placeholder",
          title: getLockTitle({ label: "subtensor-staking" }),
          description: undefined,
          tokens: BigNumber(totalStaked),
          fiat: null,
          locked: true,
          address: undefined,
          meta: null,
          isLoading: true,
        },
      ]
    }
    if (!flatHotkeys?.length) return []

    let currentIndex = 0

    const stakesInfo = addresses.map((addr, index) => {
      const hotkeysCount = hotkeys?.[index]?.length ?? 0
      const hotkeysForAddress = flatHotkeys.slice(currentIndex, currentIndex + hotkeysCount)
      const stakesForAddress = stakes?.slice(currentIndex, currentIndex + hotkeysCount)
      const validatorsForAddress = validators?.slice(currentIndex, currentIndex + hotkeysCount)
      currentIndex += hotkeysCount

      const stakeInfo = hotkeysForAddress.map((hotkey, index) => {
        const formattedStakedAmount = planckToTokens(
          stakesForAddress?.[index]?.toString() ?? "0",
          token?.decimals ?? 9,
        )

        return {
          key: `${hotkey}-subtensor-${index}`,
          title: getLockTitle({ label: "subtensor-staking" }),
          description: validatorsForAddress?.[index]?.name,
          tokens: BigNumber(formattedStakedAmount),
          fiat: Number(formattedStakedAmount) * (tokenRates?.[selectedCurrency] ?? 0),
          locked: true,
          // only show address when we're viewing balances for all accounts
          address: address ? undefined : addr,
          meta: { poolId: hotkey },
          isLoading: isBittensorValidatorLoading,
        }
      })

      return stakeInfo
    })

    return stakesInfo.flat()
  }, [
    totalStaked,
    flatHotkeys,
    isBittensorValidatorLoading,
    isStakesLoading,
    addresses,
    hotkeys,
    stakes,
    validators,
    token?.decimals,
    tokenRates,
    selectedCurrency,
    address,
  ])

  return { combinedStakeInfo }
}
