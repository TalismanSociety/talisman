import { AccountJson, Balance, Balances, Network } from "extension-core"
import { useEffect, useMemo, useState } from "react"

export default function useEmptyBalancesFilter(
  balances: Balances,
  account: AccountJson | null,
): Balances {
  const balanceFilter = useMemo(
    () =>
      account?.type === "ethereum"
        ? moonbeamFilter
        : polkadotFilter(account?.isHardware ? account?.genesisHash : null),
    [account?.type, account?.genesisHash, account?.isHardware],
  )

  const [filteredBalances, setFilteredBalances] = useState<Balances>(new Balances([]))

  useEffect(() => {
    setFilteredBalances(balances.find(balanceFilter))
  }, [balances, balanceFilter])

  return filteredBalances
}

const moonbeamFilter = (balance: Balance) =>
  (balance.isSource("substrate-native") &&
    ["moonbeam", "moonriver"].includes(balance.networkId || "")) ||
  balance.transferable.planck !== 0n

const polkadotFilter = (genesisHash?: string | null) => (balance: Balance) => {
  let showBalance = balance.transferable.planck !== 0n

  if (balance.isSource("substrate-native")) {
    showBalance =
      (genesisHash
        ? getGenesisHash(balance.network) === genesisHash
        : ["polkadot", "kusama"].includes(balance.networkId || "")) || showBalance
  }

  return showBalance
}

const getGenesisHash = (network: Network | null) => {
  return network?.platform === "polkadot" ? network.genesisHash : null
}
