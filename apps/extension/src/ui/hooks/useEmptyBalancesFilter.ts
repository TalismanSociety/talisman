import { AccountJson } from "@core/domains/accounts/types"
import { Balance, Balances } from "@core/types"
import { useEffect, useMemo, useState } from "react"

export default function useEmptyBalancesFilter(
  balances: Balances,
  account: AccountJson | null
): Balances {
  const balanceFilter = useMemo(
    () =>
      account?.type === "ethereum"
        ? moonbeamFilter
        : polkadotFilter(account?.isHardware ? account?.genesisHash : null),
    [account?.type, account?.genesisHash, account?.isHardware]
  )

  const [filteredBalances, setFilteredBalances] = useState<Balances>(new Balances([]))

  useEffect(() => {
    setFilteredBalances(balances.find(balanceFilter))
  }, [balances, balanceFilter])

  return filteredBalances
}

const moonbeamFilter = (balance: Balance) =>
  (balance.isPallet("balances") && ["moonbeam", "moonriver"].includes(balance.chainId || "")) ||
  balance.transferable.planck !== BigInt("0")

const polkadotFilter = (genesisHash?: string | null) => (balance: Balance) => {
  let showBalance = balance.transferable.planck !== BigInt("0")

  if (balance.isPallet("balances")) {
    showBalance =
      (genesisHash
        ? balance.chain?.genesisHash === genesisHash
        : ["polkadot", "kusama"].includes(balance.chainId || "")) || showBalance
  }

  return showBalance
}
