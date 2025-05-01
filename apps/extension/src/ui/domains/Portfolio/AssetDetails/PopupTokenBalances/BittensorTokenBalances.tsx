import { TokenId } from "@talismn/chaindata-provider"
import { Balances } from "extension-core"

import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useSortedGroupedStakes } from "@ui/domains/Staking/hooks/bittensor/dTao/useSortedGroupedStakes"
import { useTokenRates } from "@ui/state"

import { useTokenBalances } from "../useTokenBalances"
import { BittensorTokenBalanceList } from "./BittensorTokenBalanceList"

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
