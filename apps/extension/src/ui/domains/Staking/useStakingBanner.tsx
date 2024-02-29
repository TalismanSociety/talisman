import { appStore } from "@core/domains/app/store.app"
import { EVM_LSD_PAIRS, STAKING_BANNER_CHAINS } from "@core/domains/staking/constants"
import { isNomPoolChain, isStakingSupportedChain } from "@core/domains/staking/helpers"
import { StakingSupportedChain } from "@core/domains/staking/types"
import { Address } from "@core/types/base"
import { Token } from "@talismn/chaindata-provider"
import { stakingBannerAtom } from "@ui/atoms/stakingBanners"
import useAccounts from "@ui/hooks/useAccounts"
import { useAppState } from "@ui/hooks/useAppState"
import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { colours } from "./helpers"

const useNomPoolStakingEligibility = () => {
  const chainAddressEligibility = useAtomValue(stakingBannerAtom).nomPool

  const accounts = useAccounts("owned")
  // only balances on substrate accounts are eligible for nom pool staking
  const ownedAddresses = useMemo(
    () => accounts.filter(({ type }) => type === "sr25519").map(({ address }) => address),
    [accounts]
  )

  /**
   * @name nomPoolStakingTokenEligible
   * @returns true if the token is eligible for nom pool staking
   * on any of the addresses provided
   */
  const nomPoolStakingTokenEligible = useCallback(
    ({ token, addresses }: { token: Token; addresses: Address[] }) => {
      const chainId = token.chain?.id
      if (!chainId || !isNomPoolChain(chainId) || token.type !== "substrate-native") return false

      const addressesEligible = chainAddressEligibility[chainId]
      if (!addressesEligible) return false

      return addresses.some(
        (address) => ownedAddresses.includes(address) && addressesEligible[address]
      )
    },
    [ownedAddresses, chainAddressEligibility]
  )

  /**
   * @name nomPoolStakingAddressesEligible
   * @returns true if any token is eligible for nom pool staking
   * on any of the addresses provided
   */
  const nomPoolStakingAddressesEligible = useCallback(
    ({ addresses }: { addresses: Address[] }) => {
      const addressEligibility: Record<Address, boolean> = {}

      Object.values(chainAddressEligibility).forEach((chainNomPoolData) => {
        Object.entries(chainNomPoolData).forEach(([address, showBanner]) => {
          addressEligibility[address] = addressEligibility[address] || showBanner
        })
      })

      return ownedAddresses.some(
        (subAddress) => addresses.includes(subAddress) && addressEligibility[subAddress]
      )
    },
    [ownedAddresses, chainAddressEligibility]
  )

  return { nomPoolStakingAddressesEligible, nomPoolStakingTokenEligible }
}

const useEvmLsdStakingEligibility = () => {
  const chainAddressEligibility = useAtomValue(stakingBannerAtom).evmLsd
  const accounts = useAccounts("owned")
  const ownedAddresses = useMemo(
    () => accounts.filter(({ type }) => type === "ethereum").map(({ address }) => address),
    [accounts]
  )

  const evmLsdStakingAddressesEligible = useCallback(
    ({ addresses }: { addresses: Address[] }) => {
      const eligibleAddresses = Object.values(chainAddressEligibility)
        .map((chainData) => Object.entries(chainData))
        .flat()
        .reduce((acc, [address, showBanner]) => {
          acc[address] = acc[address] || showBanner
          return acc
        }, {} as Record<Address, boolean>)

      return addresses.some(
        (address) => ownedAddresses.includes(address) && eligibleAddresses[address]
      )
    },
    [chainAddressEligibility, ownedAddresses]
  )

  const evmLsdStakingTokenEligible = useCallback(
    ({ token, addresses }: { token: Token; addresses: Address[] }) => {
      const addressesEligible = chainAddressEligibility[token.id]
      return addresses.some(
        (address) => ownedAddresses.includes(address) && addressesEligible[address]
      )
    },
    [chainAddressEligibility, ownedAddresses]
  )

  return { evmLsdStakingAddressesEligible, evmLsdStakingTokenEligible }
}

export const useStakingBanner = () => {
  const { nomPoolStakingAddressesEligible, nomPoolStakingTokenEligible } =
    useNomPoolStakingEligibility()

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
    []
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
      else result = nomPoolStakingTokenEligible({ token, addresses })
      return (
        result &&
        !hideBannerSetting.includes(
          (token?.chain?.id || token?.evmNetwork?.id) as StakingSupportedChain
        )
      )
    },
    [nomPoolStakingTokenEligible, evmLsdStakingTokenEligible, hideBannerSetting]
  )

  const showStakingBanner = useCallback(
    ({ addresses }: { addresses: Address[] }) => {
      let result = nomPoolStakingAddressesEligible({ addresses })
      result = result || evmLsdStakingAddressesEligible({ addresses })
      return result && hideBannerSetting.length < STAKING_BANNER_CHAINS.length
    },
    [nomPoolStakingAddressesEligible, evmLsdStakingAddressesEligible, hideBannerSetting]
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
    [t]
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
