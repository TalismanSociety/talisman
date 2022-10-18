import { AccountJsonAny } from "@core/domains/accounts/types"
import { Balance, Balances } from "@core/domains/balances/types"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useMemo } from "react"

// TODO default tokens should be controlled from chaindata
const shouldDisplayBalance = (balance: Balance, account?: AccountJsonAny) => {
  return (
    balance.total.planck > 0 ||
    (account?.type !== "ethereum" &&
      balance.token?.symbol === "KSM" &&
      balance.chain?.id === "kusama") ||
    (account?.type !== "ethereum" &&
      balance.token?.symbol === "DOT" &&
      balance.chain?.id === "polkadot") ||
    (account?.type !== "sr25519" &&
      balance.token?.symbol === "MOVR" &&
      balance.chain?.id === "moonriver") ||
    (account?.type !== "sr25519" &&
      balance.token?.symbol === "GLMR" &&
      balance.chain?.id === "moonbeam") ||
    (account?.genesisHash && account.genesisHash === balance.chain?.genesisHash)
  )
}

export const useDisplayBalances = (balances: Balances) => {
  const { account } = useSelectedAccount()

  const result = useMemo(() => {
    const filtered = balances.sorted.filter((b) => shouldDisplayBalance(b, account))
    return new Balances(filtered)
  }, [account, balances.sorted])

  return result
}
