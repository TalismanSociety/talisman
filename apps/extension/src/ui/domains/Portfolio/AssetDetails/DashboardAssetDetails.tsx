import { Balances } from "@talismn/balances"

import { NoTokensMessage } from "@ui/domains/Portfolio/NoTokensMessage"

import { TokenBalances } from "./DashboardTokenBalances"
import { useAssetDetails } from "./useAssetDetails"

type DashboardAssetDetailsParams = {
  balances: Balances
  symbol: string
}

export const DashboardAssetDetails = ({ balances, symbol }: DashboardAssetDetailsParams) => {
  const { balancesByToken } = useAssetDetails(balances)

  if (balancesByToken.length === 0) return <NoTokensMessage symbol={symbol} />

  return (
    <div className="text-body-secondary">
      {balancesByToken.map(([tokenId, bal]) => (
        <TokenBalances key={tokenId} tokenId={tokenId} balances={bal} />
      ))}
    </div>
  )
}
