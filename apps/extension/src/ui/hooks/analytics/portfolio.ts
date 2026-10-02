import { networkIdForAnalytics } from "@common/analytics/funds"
import type { ACCOUNT_SELECTIONS } from "@common/analytics/portfolio"
import { symbolForAnalytics } from "@common/analytics/schema"
import { signerOf } from "@common/analytics/transactions"
import type { Network, Token } from "@talismn/chaindata-provider"
import type { AccountType } from "@talismn/keyring"
import { track } from "@ui/api/track"
import { useAccounts } from "@ui/state/accounts"
import { useCallback } from "react"

type AccountSelection = (typeof ACCOUNT_SELECTIONS)[number]

/** Mobile's account_switched, from the account list of the popup or the dashboard sidebar. */
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

/**
 * Mobile's token_details_opened, from the row that opens the page. The page groups a symbol across
 * networks: network_id only when one network holds it.
 */
export const reportTokenDetailsOpened = (
  token: Token,
  network: Network | null,
  heldNetworkCount: number
) =>
  track("token_details_opened", {
    symbol: symbolForAnalytics(token.symbol),
    ...(heldNetworkCount <= 1 && { network_id: networkIdForAnalytics(network) }),
  })
