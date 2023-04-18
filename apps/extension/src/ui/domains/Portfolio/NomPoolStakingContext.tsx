import { NOM_POOL_MIN_DEPOSIT, NOM_POOL_SUPPORTED_CHAINS } from "@core/constants"
import { appStore } from "@core/domains/app"
import { ResponseNomPoolStake } from "@core/domains/balances/types"
import { Address } from "@core/types/base"
import * as Sentry from "@sentry/browser"
import { provideContext } from "@talisman/util/provideContext"
import { ChainId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import useAccounts from "@ui/hooks/useAccounts"
import { useAppState } from "@ui/hooks/useAppState"
import useBalances from "@ui/hooks/useBalances"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useCallback, useEffect, useState } from "react"
import { useDebounce } from "react-use"

const useShowNomPoolStakingBannerProvider = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [eligibleAddressBalances, setEligibleAddressBalances] = useState<Record<Address, bigint>>(
    {}
  )
  const [nomPoolStake, setNomPoolStake] = useState<Record<ChainId, ResponseNomPoolStake>>({})
  const [updateKey, setUpdateKey] = useState<Record<ChainId, string>>({})

  const featureFlag = useIsFeatureEnabled("BANNER_NOM_POOL_STAKING")
  const balances = useBalances()
  const accounts = useAccounts()
  // only balances on substrate accounts are eligible for nom pool staking
  const substrateAddresses = accounts
    .filter(({ type }) => type === "sr25519")
    .map(({ address }) => address)

  const [showBannerSetting] = useAppState("showDotNomPoolStakingBanner")

  useEffect(() => {
    NOM_POOL_SUPPORTED_CHAINS.forEach((chainId) => {
      const balancesForChain = balances.find({ chainId }).sorted

      // for each address, get the free balance after account for ED and minimum staking deposit
      const newEligibleAddressBalances: Record<Address, bigint> = Object.fromEntries(
        balancesForChain
          .map((balance) => [
            balance.address,
            balance.free.planck -
              (balance.token &&
              "existentialDeposit" in balance.token &&
              typeof balance.token.existentialDeposit === "string"
                ? BigInt(balance.token.existentialDeposit)
                : BigInt(0)) -
              BigInt(NOM_POOL_MIN_DEPOSIT[chainId] || 0),
          ])
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([address, available]) => available > BigInt(0))
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

  const dismissNomPoolBanner = useCallback(
    () => appStore.set({ showDotNomPoolStakingBanner: false }),
    []
  )

  const showNomPoolBanner = useCallback(
    ({ chainId, addresses }: { chainId?: string; addresses: Address[] }) => {
      if (!chainId || !NOM_POOL_SUPPORTED_CHAINS.includes(chainId)) return false

      const eligible = substrateAddresses.filter((address) => {
        if (!addresses.includes(address)) return false

        return (
          Boolean(eligibleAddressBalances[address]) &&
          nomPoolStake[chainId] &&
          nomPoolStake[chainId][address] === null
        )
      })

      return featureFlag && showBannerSetting && !isLoading && eligible.length > 0
    },
    [
      featureFlag,
      substrateAddresses,
      isLoading,
      showBannerSetting,
      nomPoolStake,
      eligibleAddressBalances,
    ]
  )

  return { showNomPoolBanner, dismissNomPoolBanner }
}

export const [NomPoolStakingBannerProvider, useNomPoolStakingBanner] = provideContext(
  useShowNomPoolStakingBannerProvider
)
