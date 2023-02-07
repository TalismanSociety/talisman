import {
  DEFAULT_PORTFOLIO_TOKENS_ETHEREUM,
  DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE,
} from "@core/constants"
import { AccountJsonAny } from "@core/domains/accounts/types"
import { Balance, Balances } from "@core/domains/balances/types"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useMemo } from "react"

// TODO default tokens should be controlled from chaindata
const shouldDisplayBalance = (balance: Balance, account?: AccountJsonAny) => {
  return (
    balance.total.planck > 0 ||
    (account?.type !== "ethereum" &&
      DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE.includes(balance.tokenId)) ||
    (account?.type === "ethereum" && DEFAULT_PORTFOLIO_TOKENS_ETHEREUM.includes(balance.tokenId)) ||
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
