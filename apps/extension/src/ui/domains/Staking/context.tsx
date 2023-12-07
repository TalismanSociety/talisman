import { appStore } from "@core/domains/app/store.app"
import { ResponseNomPoolStake } from "@core/domains/balances/types"
import {
  NOM_POOL_MIN_DEPOSIT,
  NOM_POOL_SUPPORTED_CHAINS,
  STAKING_BANNER_CHAINS,
} from "@core/domains/staking/constants"
import { isNomPoolChain } from "@core/domains/staking/helpers"
import { NomPoolSupportedChain } from "@core/domains/staking/types"
import { Address } from "@core/types/base"
import * as Sentry from "@sentry/browser"
import { provideContext } from "@talisman/util/provideContext"
import { ChainId, Token } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import useAccounts from "@ui/hooks/useAccounts"
import { useAppState } from "@ui/hooks/useAppState"
import useBalances from "@ui/hooks/useBalances"
import { useCallback, useEffect, useState } from "react"
import { useDebounce } from "react-use"

const useNomPoolStakingEligibility = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [eligibleAddressBalances, setEligibleAddressBalances] = useState<Record<Address, bigint>>(
    {}
  )
  const [nomPoolStake, setNomPoolStake] = useState<Record<ChainId, ResponseNomPoolStake>>({})
  const [updateKey, setUpdateKey] = useState<Record<ChainId, string>>({})

  const balances = useBalances()
  const accounts = useAccounts("owned")
  // only balances on substrate accounts are eligible for nom pool staking
  const substrateAddresses = accounts
    .filter(({ type }) => type === "sr25519")
    .map(({ address }) => address)

  const [hideBannerSetting] = useAppState("hideStakingBanner")
  const showBannerSetting = NOM_POOL_SUPPORTED_CHAINS.length > hideBannerSetting.length

  useEffect(() => {
    NOM_POOL_SUPPORTED_CHAINS.forEach((chainId) => {
      const balancesForChain = balances.find({ chainId }).sorted

      // for each address, get the free balance after accounting for ED and minimum staking deposit
      const newEligibleAddressBalances: Record<Address, bigint> = Object.fromEntries(
        balancesForChain
          .map((balance): [string, bigint] => [
            balance.address,
            balance.free.planck -
              (balance.token &&
              "existentialDeposit" in balance.token &&
              typeof balance.token.existentialDeposit === "string"
                ? BigInt(balance.token.existentialDeposit)
                : 0n) -
              BigInt(NOM_POOL_MIN_DEPOSIT[chainId] || 0),
          ])
          .filter(([, available]) => available > 0n)
      )
      setEligibleAddressBalances(newEligibleAddressBalances)
    })
  }, [balances, setEligibleAddressBalances])

  useDebounce(
    () => {
      setIsLoading(true)
      const eligibleAddresses = Object.keys(eligibleAddressBalances)
      if (eligibleAddresses.length === 0) return

      const nomPoolPromises = NOM_POOL_SUPPORTED_CHAINS.map((chainId) => {
        const key = `${chainId}|${eligibleAddresses.join("-")}`
        if (updateKey[chainId] && key === updateKey[chainId]) return Promise.resolve()
        setUpdateKey((prev) => ({ ...prev, [chainId]: key }))
        // if we already know that an account is not eligible, there is no point asking the RPC for the staked balance
        return api
          .getNomPoolStakedBalance({ chainId, addresses: eligibleAddresses })
          .then((result) => {
            setNomPoolStake((prev) => ({ ...prev, [chainId]: result }))
          })
          .catch((err) => {
            Sentry.captureException(err, { tags: { chainId } })
          })
      })
      Promise.allSettled(nomPoolPromises).then(() => setIsLoading(false))
    },
    200,
    [eligibleAddressBalances, setUpdateKey, updateKey]
  )

  const nomPoolStakingTokenEligible = useCallback(
    ({ token, addresses }: { token?: Token; addresses: Address[] }) => {
      const chainId = token?.chain?.id
      if (!chainId || !isNomPoolChain(chainId) || token.type !== "substrate-native") return false

      const eligible = substrateAddresses.filter((address) => {
        if (!addresses.includes(address)) return false

        return (
          Boolean(eligibleAddressBalances[address]) &&
          nomPoolStake[chainId] &&
          nomPoolStake[chainId][address] === null
        )
      })

      return !hideBannerSetting.includes(chainId) && !isLoading && eligible.length > 0
    },
    [substrateAddresses, isLoading, hideBannerSetting, nomPoolStake, eligibleAddressBalances]
  )

  const nomPoolStakingAddressesEligible = useCallback(
    ({ addresses }: { addresses: Address[] }) => {
      const addressHasNotStaked: Record<Address, boolean> = {}
      Object.values(nomPoolStake).forEach((chainNomPoolData) => {
        if (!chainNomPoolData) return
        Object.entries(chainNomPoolData).forEach(([address, stake]) => {
          // eligible if stake is null, or stake for previously-checked chain is null
          addressHasNotStaked[address] = addressHasNotStaked[address] || stake === null
        })
      })

      const eligible = substrateAddresses.filter((subAddress) => {
        if (!addresses.includes(subAddress)) return false
        return Boolean(eligibleAddressBalances[subAddress]) && addressHasNotStaked[subAddress]
      })
      return showBannerSetting && !isLoading && eligible.length > 0
    },
    [substrateAddresses, isLoading, showBannerSetting, nomPoolStake, eligibleAddressBalances]
  )

  return { nomPoolStakingAddressesEligible, nomPoolStakingTokenEligible, isLoading }
}

const useShowStakingBannerProvider = () => {
  const {
    nomPoolStakingAddressesEligible,
    nomPoolStakingTokenEligible,
    isLoading: nomPoolsLoading,
  } = useNomPoolStakingEligibility()

  const isLoading = nomPoolsLoading

  const dismissStakingBanner = useCallback(
    (chainId?: NomPoolSupportedChain) =>
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
      const nomPoolsEligible = nomPoolStakingTokenEligible({ token, addresses })
      return nomPoolsEligible && !isLoading
    },
    [nomPoolStakingTokenEligible, isLoading]
  )

  const showStakingBanner = useCallback(
    ({ addresses }: { addresses: Address[] }) => {
      const nomPoolsEligible = nomPoolStakingAddressesEligible({ addresses })
      return nomPoolsEligible && !isLoading
    },
    [nomPoolStakingAddressesEligible, isLoading]
  )

  return { showStakingBanner, showTokenStakingBanner, dismissStakingBanner }
}

export const [StakingBannerProvider, useStakingBanner] = provideContext(
  useShowStakingBannerProvider
)
