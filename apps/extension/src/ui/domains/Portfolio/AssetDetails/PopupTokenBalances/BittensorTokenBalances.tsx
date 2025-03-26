import { TokenId } from "@talismn/chaindata-provider"
import { Balances } from "extension-core"
import { useMemo } from "react"

import { CHAIN_INFO } from "@ui/domains/Staking/Bittensor/constants"
import { sortGroupedStakes } from "@ui/domains/Staking/Bittensor/sortGroupedStakes"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useTokenRates } from "@ui/state"

import { useTokenBalances } from "../useTokenBalances"
import { BittensorTokenBalanceList } from "./BittensorTokenBalanceList"

type TokenBalancesParams = {
  tokenId: TokenId
  balances: Balances
}

export const BittensorTokenBalances = ({ balances, tokenId }: TokenBalancesParams) => {
  const tokenRates = useTokenRates(tokenId)

  const combinedSubnetData = useCombinedSubnetData()
  const tokenBalances = useTokenBalances({
    tokenId,
    balances,
  })

  const groupedStakes = Object.groupBy(
    tokenBalances.detailRows,
    ({ meta }) => meta?.netuid ?? CHAIN_INFO,
  )

  const sortedGroupedStakes = useMemo(
    () => sortGroupedStakes(groupedStakes, CHAIN_INFO),
    [groupedStakes],
  )

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
