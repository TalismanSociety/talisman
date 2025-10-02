import { useQuery } from "@tanstack/react-query"
import { YieldBalanceQuery, YieldPositionBalance, YieldPositionItem } from "extension-core"
import { useMemo } from "react"

import { useAccounts, useBalances, useNetworksMapById, useTokens } from "@ui/state"
import { YIELD_SUPPORTED_NETWORKS } from "@ui/util/constants"

import { yieldApi } from "../services/yieldApi"
import { mapNetworkToYieldNetwork } from "../utils/networkMapping"

export const useYieldBalances = () => {
  const allAccounts = useAccounts("owned")
  const balances = useBalances("owned")
  const tokens = useTokens({ activeOnly: true, includeTestnets: false })
  const networksMap = useNetworksMapById({ activeOnly: true, includeTestnets: false })

  // Create queries for accounts that have tokens on supported networks
  const queries = useMemo(() => {
    const balanceQueries: YieldBalanceQuery[] = []
    const uniqueQueries = new Set<string>()

    allAccounts.forEach((account) => {
      // Get all tokens for this account by checking balances
      const accountBalances = balances.find({ address: account.address })
      const accountTokens = accountBalances.each
        .map((balance) => tokens.find((token) => token.id === balance.tokenId))
        .filter(Boolean)

      // Get unique networks from tokens
      const accountNetworks = new Set<string>()
      accountTokens.forEach((token) => {
        if (token) {
          const network = networksMap[token.networkId]
          if (network) {
            const yieldNetwork = mapNetworkToYieldNetwork({
              platform: network.platform,
              id: network.id,
            })
            if (yieldNetwork && YIELD_SUPPORTED_NETWORKS.includes(yieldNetwork)) {
              accountNetworks.add(yieldNetwork)
            }
          }
        }
      })

      // Create queries for each supported network this account has tokens on
      accountNetworks.forEach((network) => {
        const queryKey = `${account.address}-${network}`
        if (!uniqueQueries.has(queryKey)) {
          uniqueQueries.add(queryKey)
          balanceQueries.push({
            address: account.address,
            network,
          })
        }
      })
    })

    return balanceQueries
  }, [allAccounts, balances, tokens, networksMap])

  const {
    data: yieldBalancesResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["yieldBalances", queries],
    queryFn: async () => {
      if (queries.length === 0) {
        return { items: [], errors: [] }
      }

      return yieldApi.getYieldBalances({ queries })
    },
    enabled: queries.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    refetchOnWindowFocus: false,
    retry: 2,
  })

  // Calculate totals and organize data by token
  const { totalUsd, yieldPositions, positionsByAddress, allBalances, groupedByToken } =
    useMemo(() => {
      if (!yieldBalancesResponse?.items) {
        return {
          totalUsd: "0",
          yieldPositions: [],
          positionsByAddress: new Map(),
          allBalances: [],
          groupedByToken: new Map(),
        }
      }

      const positionsByAddress = new Map<string, YieldPositionBalance[]>()
      const allBalances: YieldPositionBalance[] = []
      const groupedByToken = new Map<
        string,
        {
          token: YieldPositionBalance["token"]
          positions: Array<{ balance: YieldPositionBalance; yieldId: string }>
          totalAmount: string
          totalAmountUsd: string
          holdingsCount: number
        }
      >()
      let totalUsdValue = 0

      yieldBalancesResponse.items.forEach((item: YieldPositionItem) => {
        item.balances.forEach((balance: YieldPositionBalance) => {
          allBalances.push(balance)
          totalUsdValue += parseFloat(balance.amountUsd) || 0

          const existing = positionsByAddress.get(balance.address) || []
          positionsByAddress.set(balance.address, [...existing, balance])

          // Group by token symbol
          const tokenSymbol = balance.token.symbol
          const existingGroup = groupedByToken.get(tokenSymbol)

          if (existingGroup) {
            existingGroup.positions.push({ balance, yieldId: item.yieldId })
            existingGroup.totalAmountUsd = (
              parseFloat(existingGroup.totalAmountUsd) + parseFloat(balance.amountUsd)
            ).toString()
            existingGroup.holdingsCount = existingGroup.positions.length
          } else {
            groupedByToken.set(tokenSymbol, {
              token: balance.token,
              positions: [{ balance, yieldId: item.yieldId }],
              totalAmount: balance.amount,
              totalAmountUsd: balance.amountUsd,
              holdingsCount: 1,
            })
          }
        })
      })

      return {
        totalUsd: totalUsdValue.toString(),
        yieldPositions: yieldBalancesResponse.items,
        positionsByAddress,
        allBalances,
        groupedByToken,
      }
    }, [yieldBalancesResponse])

  return {
    yieldPositions,
    allBalances,
    totalUsd,
    positionsByAddress,
    groupedByToken,
    errors: yieldBalancesResponse?.errors || [],
    isLoading,
    error,
    refetch,
  }
}
