import { Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"

import { CHAIN_INFO } from "@ui/domains/Staking/Bittensor/utils/constants"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useSortedGroupedStakes } from "@ui/domains/Staking/hooks/bittensor/dTao/useSortedGroupedStakes"
import { useTokenRates } from "@ui/state"

import { useTokenBalances } from "../useTokenBalances"
import { BittensorTokenBalanceList } from "./BittensorTokenBalanceList"
import { TokenBalancesDetailRow } from "./TokenBalancesDetailRow"
import { TokenBalancesList } from "./TokenBalancesList"

type TokenBalancesParams = {
  tokenId: TokenId
  balances: Balances
}

export const BittensorTokenBalances = ({ balances, tokenId }: TokenBalancesParams) => {
  const tokenRates = useTokenRates(tokenId)
  const { sortedGroupedStakes } = useSortedGroupedStakes({ tokenId, balances })

  const combinedSubnetData = useCombinedSubnetData()
  const tokenBalances = useTokenBalances({
    tokenId,
    balances,
  })

  return sortedGroupedStakes.map(([key, groupedStakesByNetuid]) => {
    if (!groupedStakesByNetuid) return null

    if (key === CHAIN_INFO) {
      const { network, token, status } = tokenBalances
      if (!network || !token) return null
      return (
        <TokenBalancesList
          key={key}
          chainOrNetworkId={network.id}
          detailRowsLength={tokenBalances.detailRows.length}
          tokenId={tokenId}
          balances={balances}
        >
          {groupedStakesByNetuid.map((row, i) => (
            <TokenBalancesDetailRow
              key={i}
              tokenId={tokenId}
              status={status}
              row={row}
              symbol={token.symbol}
              tokenDecimals={token.decimals}
              isLastRow={groupedStakesByNetuid.length === i + 1}
            />
          ))}
        </TokenBalancesList>
      )
    }

    return (
      <BittensorTokenBalanceList
        key={key}
        listKey={key}
        groupedStakesByNetuid={groupedStakesByNetuid}
        combinedSubnetData={combinedSubnetData}
        tokenBalances={tokenBalances}
        tokenRates={tokenRates}
        balances={balances}
        tokenId={tokenId}
      />
    )
  })
}
