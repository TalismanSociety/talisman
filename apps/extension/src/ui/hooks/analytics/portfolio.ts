import { networkIdForAnalytics, tokenSymbolForAnalytics } from "@common/analytics/funds"
import type { ACCOUNT_SELECTIONS } from "@common/analytics/portfolio"
import { signerOf } from "@common/analytics/transactions"
import type { Network, Token } from "@talismn/chaindata-provider"
import type { AccountType } from "@talismn/keyring"
import { track } from "@ui/api/track"
import { useAccounts } from "@ui/state/accounts"
import { useCallback } from "react"

type AccountSelection = (typeof ACCOUNT_SELECTIONS)[number]

export const useReportAccountSwitched = () => {
  const accountsTotal = useAccounts().length
  return useCallback(
    (selection: AccountSelection, accountType?: AccountType) => {
      const signer = accountType && signerOf(accountType)
      track("account_switched", {
        selection,
        accounts_total: accountsTotal,
        ...(signer && { account_type: signer }),
      })
    },
    [accountsTotal]
  )
}

export const reportTokenDetailsOpened = (
  token: Token,
  network: Network | null,
  heldNetworkCount: number
) =>
  track("token_details_opened", {
    symbol: tokenSymbolForAnalytics(token),
    ...(heldNetworkCount <= 1 && { network_id: networkIdForAnalytics(network) }),
  })
