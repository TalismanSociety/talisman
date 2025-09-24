import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { useAccounts } from "@ui/state"

import {
  yieldApi,
  YieldBalanceQuery,
  YieldPositionBalance,
  YieldPositionItem,
} from "../services/yieldApi"

// Supported networks for yield balances
const SUPPORTED_NETWORKS = ["ethereum", "base"] as const

export const useYieldBalances = () => {
  const allAccounts = useAccounts("owned")

  // Create queries for all owned accounts across supported networks
  const queries = useMemo(() => {
    const balanceQueries: YieldBalanceQuery[] = []

    allAccounts.forEach((account) => {
      SUPPORTED_NETWORKS.forEach((network) => {
        balanceQueries.push({
          address: account.address,
          network,
        })
      })
    })

    return balanceQueries
  }, [allAccounts])

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
