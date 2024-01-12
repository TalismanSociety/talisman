import { appStore } from "@core/domains/app/store.app"
import {
  EVM_LSD_PAIRS,
  NOM_POOL_MIN_DEPOSIT,
  NOM_POOL_SUPPORTED_CHAINS,
  STAKING_BANNER_CHAINS,
} from "@core/domains/staking/constants"
import { isNomPoolChain, isStakingSupportedChain } from "@core/domains/staking/helpers"
import { StakingSupportedChain } from "@core/domains/staking/types"
import { Address } from "@core/types/base"
import { ChainId, IToken, Token } from "@talismn/chaindata-provider"
import { accountsQuery, balancesFilterQuery } from "@ui/atoms"
import useAccounts from "@ui/hooks/useAccounts"
import { useAppState } from "@ui/hooks/useAppState"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { selector, useRecoilValue } from "recoil"

import { colours } from "./helpers"

type ChainAddressBalances = Record<ChainId, Record<Address, bigint>>

const safelyGetExistentialDeposit = (token?: IToken | null): bigint => {
  if (token && "existentialDeposit" in token && typeof token.existentialDeposit === "string")
    return BigInt(token.existentialDeposit)
  return 0n
}

const ownedBalancesState = selector({
  key: "ownedBalancesState",
  get: ({ get }) => {
    return get(balancesFilterQuery("owned"))
  },
})

const nomPoolEligibleAddressBalancesState = selector({
  key: "nomPoolEligibleAddressBalancesState",
  get: ({ get }) => {
    const balances = get(ownedBalancesState)
    const accounts = get(accountsQuery("owned"))

    const substrateAddresses = accounts
      .filter(({ type }) => type === "sr25519")
      .map(({ address }) => address)

    return NOM_POOL_SUPPORTED_CHAINS.reduce((acc, chainId) => {
      const balancesForChain = balances.find({ chainId, source: "substrate-native" })

      // for each address, get the free balance after accounting for ED and minimum staking deposit
      const addressAvailableBalances: Record<Address, bigint> = substrateAddresses.reduce(
        (acc, address) => {
          const addressBalances = balancesForChain.find({ address })
          if (!addressBalances) return acc
          addressBalances.sorted.forEach((balance) => {
            // if the balance is less than the ED - minimum stake, it is not eligible
            // however because we aggregate balances across accounts here, we don't want to store available values of less than 0
            const realAvailable =
              balance.free.planck -
              safelyGetExistentialDeposit(balance.token) -
              BigInt(NOM_POOL_MIN_DEPOSIT[chainId] || 0)
            const available = realAvailable > 0n ? realAvailable : 0n
            acc[address] = address in acc ? acc[address] + available : available
          })
          return acc
        },
        {} as Record<Address, bigint>
      )

      const positiveEligibleAddressBalances: Record<Address, bigint> = Object.fromEntries(
        Object.entries(addressAvailableBalances).filter(([, available]) => available > 0n)
      )

      return {
        ...acc,
        [chainId]: positiveEligibleAddressBalances,
      }
    }, {} as ChainAddressBalances)
  },
})

const nomPoolStakedBalancesState = selector({
  key: "nomPoolStakedBalancesState",
  get: async ({ get }) => {
    const nomPoolEligibleAddressBalances = get(nomPoolEligibleAddressBalancesState)
    const eligibleChains = Object.keys(nomPoolEligibleAddressBalances)
    type AddressNomPoolStake = Record<string, null | bigint>
    const result: Record<ChainId, AddressNomPoolStake> = {}

    if (eligibleChains.length === 0) return {}
    const balances = get(ownedBalancesState)

    NOM_POOL_SUPPORTED_CHAINS.map((chainId) => {
      const eligibleAddressesBalances = nomPoolEligibleAddressBalances[chainId]
      const addresses = eligibleAddressesBalances ? Object.keys(eligibleAddressesBalances) : []
      if (addresses.length == 0) return

      result[chainId] = balances
        .find({ chainId, source: "substrate-native" })
        .each.reduce((acc, b) => {
          if (!addresses.includes(b.address)) return acc

          acc[b.address] = b.reserves.reduce((balanceSum, r) => {
            if (
              (r.label === "nompools-staking" || r.label === "nompools-unbonding") &&
              r.amount.planck > 0n
            ) {
              if (balanceSum === null) balanceSum = r.amount.planck
              else balanceSum += r.amount.planck
            }
            return balanceSum
          }, null as bigint | null)

          return acc
        }, {} as AddressNomPoolStake)
    })

    return result
  },
})

const useNomPoolStakingEligibility = () => {
  const eligibleAddressBalances = useRecoilValue(nomPoolEligibleAddressBalancesState)
  const nomPoolStake = useRecoilValue(nomPoolStakedBalancesState)
  const accounts = useAccounts("owned")
  // only balances on substrate accounts are eligible for nom pool staking
  const substrateAddresses = useMemo(
    () => accounts.filter(({ type }) => type === "sr25519").map(({ address }) => address),
    [accounts]
  )

  const nomPoolStakingTokenEligible = useCallback(
    ({ token, addresses }: { token?: Token; addresses: Address[] }) => {
      const chainId = token?.chain?.id
      if (!chainId || !isNomPoolChain(chainId) || token.type !== "substrate-native") return false

      const eligible = addresses.filter((address) => {
        if (!substrateAddresses.includes(address)) return false
        return (
          Boolean(eligibleAddressBalances[chainId]?.[address]) &&
          nomPoolStake[chainId] &&
          nomPoolStake[chainId]?.[address] === null
        )
      })

      return eligible.length > 0
    },
    [substrateAddresses, nomPoolStake, eligibleAddressBalances]
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
      return eligible.length > 0
    },
    [substrateAddresses, nomPoolStake, eligibleAddressBalances]
  )

  return { nomPoolStakingAddressesEligible, nomPoolStakingTokenEligible }
}

type EvmLsdEligibility = Record<Address, Array<keyof typeof EVM_LSD_PAIRS>>

const evmLsdEligibleAddressesState = selector({
  key: "evmLsdEligibleAddressesState",
  get: ({ get }) => {
    const balances = get(balancesFilterQuery("all"))
    const accounts = get(accountsQuery("owned"))

    // only balances on ethereum accounts are eligible for lido staking
    const ethereumAddresses = accounts
      .filter(({ type }) => type === "ethereum")
      .map(({ address }) => address)

    return Object.entries(EVM_LSD_PAIRS).reduce((acc, [pairName, { base, derivative }]) => {
      const balancePairs = balances.find([{ tokenId: base }, { tokenId: derivative }])

      // for each address, determine whether it has a balance of the base token but not the derivative
      for (const address of ethereumAddresses) {
        const derivativeBalance = balancePairs.find({ address, tokenId: derivative })
        const baseBalance = balancePairs.find({ address, tokenId: base })
        if (baseBalance.sorted.length > 0 && baseBalance.sorted[0].free.planck > 0n) {
          if (
            derivativeBalance.sorted.length === 0 ||
            derivativeBalance.sorted[0].free.planck === 0n
          ) {
            if (!acc[address]) acc[address] = []
            acc[address].push(pairName)
          }
        }
      }

      return acc
    }, {} as EvmLsdEligibility)
  },
})

const useEvmLsdStakingEligibility = () => {
  const eligibleAddresses = useRecoilValue(evmLsdEligibleAddressesState)

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
      let result = false
      const lsdTokenBases = Object.values(EVM_LSD_PAIRS).map(({ base }) => base)
      if (lsdTokenBases.includes(token?.id || ""))
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
      const lsdTokenBases = Object.values(EVM_LSD_PAIRS).map(({ base }) => base)
      if (lsdTokenBases.includes(token?.id || ""))
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
