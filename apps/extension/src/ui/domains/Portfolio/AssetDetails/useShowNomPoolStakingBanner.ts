import { NOM_POOL_MIN_DEPOSIT, NOM_POOL_SUPPORTED_CHAINS } from "@core/constants"
import { appStore } from "@core/domains/app"
import { Balances } from "@core/domains/balances/types"
import { Address } from "@core/types/base"
import { ChainId } from "@talismn/chaindata-provider"
import useAccounts from "@ui/hooks/useAccounts"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useNomPoolStakedBalance } from "./useNomPoolStakedBalance"

export type NomPoolStakingOptions = {
  chainId?: ChainId
  balances: Balances
}

export const useShowNomPoolStakingBanner = ({
  chainId = "polkadot",
  balances,
}: NomPoolStakingOptions) => {
  const [showBannerSetting, setShowBannerSetting] = useState(false)

  useEffect(() => {
    const sub = appStore.observable.subscribe(({ showDotNomPoolStakingBanner }) =>
      setShowBannerSetting(showDotNomPoolStakingBanner)
    )
    return () => sub.unsubscribe()
  }, [])

  const balancesForChain = balances.find({ chainId }).sorted
  const accounts = useAccounts()
  // only balances on substrate accounts are eligible for nom pool staking
  const substrateAddresses = accounts
    .filter(({ type }) => type === "sr25519")
    .map(({ address }) => address)

  // for each address, get the free balance after account for ED and minimum staking deposit
  const eligibleAddressBalances: Record<Address, bigint> = useMemo(
    () =>
      Object.fromEntries(
        balancesForChain
          .map((balance) => [
            balance.address,
            balance.free.planck -
              (balance.token && "existentialDeposit" in balance.token
                ? BigInt(balance.token.existentialDeposit)
                : BigInt(0)) -
              BigInt(NOM_POOL_MIN_DEPOSIT[chainId] || 0),
          ])
          .filter(([address, available]) => available > BigInt(0))
      ),
    [chainId, balancesForChain]
  )

  // if we already know that an account is not eligible, there is no point asking the RPC for the staked balance
  const { nomPoolStake, isLoading, error } = useNomPoolStakedBalance({
    chainId,
    addresses: Object.keys(eligibleAddressBalances),
  })

  const eligible = useMemo(
    () =>
      Object.fromEntries(
        substrateAddresses.map((address) => {
          const isAddressEligible =
            Boolean(eligibleAddressBalances[address]) && nomPoolStake[address] === false

          return [address, NOM_POOL_SUPPORTED_CHAINS.includes(chainId) && isAddressEligible]
        })
      ),
    [substrateAddresses, eligibleAddressBalances, nomPoolStake, chainId]
  )

  const dismissBanner = useCallback(() => appStore.set({ showDotNomPoolStakingBanner: false }), [])

  const showBanner =
    !isLoading && !error && Object.values(eligible).some((x) => x) && showBannerSetting

  return { eligible, isLoading, error, showBanner, dismissBanner }
}
