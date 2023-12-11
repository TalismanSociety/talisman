import { appStore } from "@core/domains/app/store.app"
import { ResponseNomPoolStake } from "@core/domains/balances/types"
import {
  EVM_LSD_PAIRS,
  NOM_POOL_MIN_DEPOSIT,
  NOM_POOL_SUPPORTED_CHAINS,
  STAKING_BANNER_CHAINS,
} from "@core/domains/staking/constants"
import { isNomPoolChain } from "@core/domains/staking/helpers"
import { StakingSupportedChain } from "@core/domains/staking/types"
import { Address } from "@core/types/base"
import * as Sentry from "@sentry/browser"
import { provideContext } from "@talisman/util/provideContext"
import { ChainId, Token } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import useAccounts from "@ui/hooks/useAccounts"
import { useAppState } from "@ui/hooks/useAppState"
import useBalances from "@ui/hooks/useBalances"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
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

type EvmLsdEligibility = Record<Address, Array<keyof typeof EVM_LSD_PAIRS>>

const useEvmLsdStakingEligibility = () => {
  const balances = useBalances()
  const accounts = useAccounts("owned")
  // only balances on ethereum accounts are eligible for lido staking
  const ethereumAddresses = accounts
    .filter(({ type }) => type === "ethereum")
    .map(({ address }) => address)

  const eligibleAddresses = useMemo(() => {
    const resultAddresses: EvmLsdEligibility = {}

    Object.entries(EVM_LSD_PAIRS).forEach(([pairName, { base, derivative }]) => {
      const balancePairs = balances.find([{ tokenId: base }, { tokenId: derivative }])

      // for each address, determine whether it has a balance of the base token but not the derivative
      ethereumAddresses.forEach((address) => {
        const derivativeBalance = balancePairs.find({ address, tokenId: derivative })
        const baseBalance = balancePairs.find({ address, tokenId: base })
        if (baseBalance.sorted.length > 0 && baseBalance.sorted[0].free.planck > 0n) {
          if (
            derivativeBalance.sorted.length === 0 ||
            derivativeBalance.sorted[0].free.planck === 0n
          )
            resultAddresses[address] = [...(resultAddresses[address] || []), pairName]
        }
      })
    })
    return resultAddresses
  }, [balances, ethereumAddresses])

  const evmLsdStakingAddressesEligible = useCallback(
    ({ addresses }: { addresses: Address[] }) => {
      const eligible = addresses.filter((address) => eligibleAddresses[address]?.length > 0)
      return eligible.length > 0
    },
    [eligibleAddresses]
  )

  const evmLsdStakingTokenEligible = useCallback(
    ({ token, addresses }: { token?: Token; addresses: Address[] }) => {
      const matchingAddresses = Object.keys(eligibleAddresses).filter((address) =>
        addresses.includes(address)
      )
      if (matchingAddresses.length === 0) return false
      const eligiblePairs = Array.from(
        new Set(matchingAddresses.map((address) => eligibleAddresses[address]).flat())
      )
      const eligibleBases = eligiblePairs.map((pairName) => EVM_LSD_PAIRS[pairName].base)
      return eligibleBases.includes(token?.id || "")
    },
    [eligibleAddresses]
  )

  return { evmLsdStakingAddressesEligible, evmLsdStakingTokenEligible }
}

const useShowStakingBannerProvider = () => {
  const {
    nomPoolStakingAddressesEligible,
    nomPoolStakingTokenEligible,
    isLoading: nomPoolsLoading,
  } = useNomPoolStakingEligibility()

  const { evmLsdStakingAddressesEligible, evmLsdStakingTokenEligible } =
    useEvmLsdStakingEligibility()

  const isLoading = nomPoolsLoading

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
      let result = false
      const lsdTokenBases = Object.values(EVM_LSD_PAIRS).map(({ base }) => base)
      if (lsdTokenBases.includes(token?.id || ""))
        result = evmLsdStakingTokenEligible({ token, addresses })
      else result = nomPoolStakingTokenEligible({ token, addresses })

      return result && !isLoading
    },
    [nomPoolStakingTokenEligible, evmLsdStakingTokenEligible, isLoading]
  )

  const showStakingBanner = useCallback(
    ({ addresses }: { addresses: Address[] }) => {
      let result = nomPoolStakingAddressesEligible({ addresses })
      result = result || evmLsdStakingAddressesEligible({ addresses })
      return result && !isLoading
    },
    [nomPoolStakingAddressesEligible, evmLsdStakingAddressesEligible, isLoading]
  )

  const getStakingMessage = useCallback(
    ({ token }: { token?: Token }) => {
      const lsdTokenBases = Object.values(EVM_LSD_PAIRS).map(({ base }) => base)
      if (lsdTokenBases.includes(token?.id || ""))
        return t("This balance is eligible for Nomination Pool Staking via the Talisman Portal.")
      else if (token?.chain?.id && isNomPoolChain(token.chain.id))
        return t("This balance is eligible for Liquid Staking via the Talisman Portal.")
      return
    },
    [t]
  )

  return { showStakingBanner, showTokenStakingBanner, dismissStakingBanner, getStakingMessage }
}

export const [StakingBannerProvider, useStakingBanner] = provideContext(
  useShowStakingBannerProvider
)
