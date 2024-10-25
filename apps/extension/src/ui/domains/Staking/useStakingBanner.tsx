import { Token } from "@talismn/chaindata-provider"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import {
  Address,
  appStore,
  EVM_LSD_PAIRS,
  STAKING_BANNER_CHAINS,
  StakingSupportedChain,
} from "@extension/core"
import { useAccounts, useAppState, useStakingBannerStore } from "@ui/state"

import { colours, isNomPoolChain, isStakingSupportedChain } from "./helpers"

const useEvmLsdStakingEligibility = () => {
  const chainAddressEligibility = useStakingBannerStore().evmLsd
  const accounts = useAccounts("owned")
  const ownedAddresses = useMemo(
    () => accounts.filter(({ type }) => type === "ethereum").map(({ address }) => address),
    [accounts],
  )

  const evmLsdStakingAddressesEligible = useCallback(
    ({ addresses }: { addresses: Address[] }) => {
      const eligibleAddresses = Object.values(chainAddressEligibility)
        .map((chainData) => Object.entries(chainData))
        .flat()
        .reduce(
          (acc, [address, showBanner]) => {
            acc[address] = acc[address] || showBanner
            return acc
          },
          {} as Record<Address, boolean>,
        )

      return addresses.some(
        (address) => ownedAddresses.includes(address) && eligibleAddresses[address],
      )
    },
    [chainAddressEligibility, ownedAddresses],
  )

  const evmLsdStakingTokenEligible = useCallback(
    ({ token, addresses }: { token: Token; addresses: Address[] }) => {
      const addressesEligible = chainAddressEligibility[token.id]
      return addresses.some(
        (address) => ownedAddresses.includes(address) && addressesEligible[address],
      )
    },
    [chainAddressEligibility, ownedAddresses],
  )

  return { evmLsdStakingAddressesEligible, evmLsdStakingTokenEligible }
}

export const useStakingBanner = () => {
  const { evmLsdStakingAddressesEligible, evmLsdStakingTokenEligible } =
    useEvmLsdStakingEligibility()
  const [hideBannerSetting] = useAppState("hideStakingBanner")

  const { t } = useTranslation()

  const dismissStakingBanner = useCallback(
    (chainId?: StakingSupportedChain) =>
      appStore.mutate((existing) => {
        const newValue = chainId ? [chainId] : STAKING_BANNER_CHAINS
        return {
          ...existing,
          hideStakingBanner: Array.from(new Set([...existing.hideStakingBanner, ...newValue])),
        }
      }),
    [],
  )

  const showTokenStakingBanner = useCallback(
    ({ token, addresses }: { token?: Token; addresses: Address[] }) => {
      if (!token) return false
      let result = false
      const lsdTokenBases = Object.values(EVM_LSD_PAIRS)
        .flatMap((pairInfo) => Object.values(pairInfo))
        .map(({ base }) => base)

      if (lsdTokenBases.includes(token.id))
        result = evmLsdStakingTokenEligible({ token, addresses })

      return (
        result &&
        !hideBannerSetting.includes(
          (token?.chain?.id || token?.evmNetwork?.id) as StakingSupportedChain,
        )
      )
    },
    [evmLsdStakingTokenEligible, hideBannerSetting],
  )

  const showStakingBanner = useCallback(
    ({ addresses }: { addresses: Address[] }) =>
      evmLsdStakingAddressesEligible({ addresses }) &&
      hideBannerSetting.length < STAKING_BANNER_CHAINS.length,
    [evmLsdStakingAddressesEligible, hideBannerSetting],
  )

  const getStakingMessage = useCallback(
    ({ token }: { token?: Token }) => {
      if (!token) return
      const lsdTokenBases = Object.values(EVM_LSD_PAIRS)
        .flatMap((pairInfo) => Object.values(pairInfo))
        .map(({ base }) => base)

      if (lsdTokenBases.includes(token.id))
        return t("This balance is eligible for Liquid Staking via the Talisman Portal.")
      else if (token?.chain?.id && isNomPoolChain(token.chain.id))
        return t("This balance is eligible for Nomination Pool Staking via the Talisman Portal.")
      return
    },
    [t],
  )

  const getBannerColours = useCallback(({ token }: { token?: Token }) => {
    const chainId = token?.chain?.id || token?.evmNetwork?.id
    if (chainId && isStakingSupportedChain(chainId)) {
      return colours[chainId as StakingSupportedChain]
    }
    return
  }, [])

  return {
    showStakingBanner,
    showTokenStakingBanner,
    dismissStakingBanner,
    getStakingMessage,
    getBannerColours,
  }
}
