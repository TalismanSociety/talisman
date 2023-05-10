import {
  DEFAULT_PORTFOLIO_TOKENS_ETHEREUM,
  DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE,
} from "@core/constants"
import { AccountJsonAny } from "@core/domains/accounts/types"
import { Balance, Balances } from "@core/domains/balances/types"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useMemo } from "react"

// TODO: default tokens should be controlled from chaindata
const shouldDisplayBalance =
  (account?: AccountJsonAny) =>
  (balance: Balance): boolean => {
    // don't show substrate balances for ledger ethereum accounts (MOVR, GLMR etc exist on both sides)
    if (account?.type === "ethereum" && account.isHardware && !balance.evmNetworkId) return false

    const hasNonZeroBalance = balance.total.planck > 0
    if (hasNonZeroBalance) return true

    const isSubstrateAccount = account?.type !== "ethereum"
    const isSubstrateToken = DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE.includes(balance.tokenId)
    if (isSubstrateAccount && isSubstrateToken) return true

    const isEthereumAccount = !account || account?.type === "ethereum"
    const isEthereumToken = DEFAULT_PORTFOLIO_TOKENS_ETHEREUM.includes(balance.tokenId)
    if (isEthereumAccount && isEthereumToken) return true

    if (account?.genesisHash && account.genesisHash === balance.chain?.genesisHash) return true

    return false
  }

export const useDisplayBalances = (balances: Balances) => {
  const { account } = useSelectedAccount()

  return useMemo(() => balances.find(shouldDisplayBalance(account)), [account, balances])
}
