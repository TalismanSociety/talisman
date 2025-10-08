import {
  BalanceDto,
  TokenDto,
  YieldBalanceQuery,
  YieldBalancesDtoWithProduct,
  YieldDto,
} from "extension-core"
import { useMemo } from "react"

import { useAccounts, useBalances, useNetworksMapById, useTokens } from "@ui/state"
import { useYieldRawBalances } from "@ui/state/yield"
import { YIELD_SUPPORTED_NETWORKS } from "@ui/util/constants"

import { mapNetworkToYieldNetwork } from "../utils/networkMapping"

export const useYieldBalances = () => {
  const allAccounts = useAccounts("owned")
  const balances = useBalances("owned")
  const tokens = useTokens({ activeOnly: true, includeTestnets: false })
  const networksMap = useNetworksMapById({ activeOnly: true, includeTestnets: false })

  // Create queries for accounts that have tokens on supported networks
  // NOTE: queries are built here for parity with DeFi flow, but
  // the core subscription currently aggregates by address without network filters.
  // Keep computed but unused to allow quick extension later.
  const _queries = useMemo(() => {
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

  const yieldBalancesLoadable = useYieldRawBalances()
  const yieldBalancesResponse = useMemo(() => {
    if (!yieldBalancesLoadable?.data) return { items: [], errors: [] }
    // Core observable emits items[] already; align to UI expectations
    return {
      items: yieldBalancesLoadable.data as YieldBalancesDtoWithProduct[],
      errors: [] as unknown[],
    }
  }, [yieldBalancesLoadable])
  const isLoading = yieldBalancesLoadable.status === "loading"
  const error = undefined
  const refetch = () => {}

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

      const positionsByAddress = new Map<string, BalanceDto[]>()
      const allBalances: BalanceDto[] = []
      const groupedByToken = new Map<
        string,
        {
          token: TokenDto
          positions: Array<{
            balance: BalanceDto
            yieldId: string
            product?: YieldDto
          }>
          totalAmount: string
          totalAmountUsd: string
          holdingsCount: number
        }
      >()
      let totalUsdValue = 0

      yieldBalancesResponse.items.forEach((item: YieldBalancesDtoWithProduct) => {
        item.balances.forEach((balance: BalanceDto) => {
          allBalances.push(balance)
          totalUsdValue += parseFloat(balance.amountUsd || "0")

          const existing = positionsByAddress.get(balance.address) || []
          positionsByAddress.set(balance.address, [...existing, balance])

          // Group by token symbol
          const tokenSymbol = balance.token.symbol
          const existingGroup = groupedByToken.get(tokenSymbol)

          if (existingGroup) {
            existingGroup.positions.push({ balance, yieldId: item.yieldId, product: item.product })
            existingGroup.totalAmountUsd = (
              parseFloat(existingGroup.totalAmountUsd) + parseFloat(balance.amountUsd || "0")
            ).toString()
            existingGroup.holdingsCount = existingGroup.positions.length
          } else {
            groupedByToken.set(tokenSymbol, {
              token: balance.token,
              positions: [{ balance, yieldId: item.yieldId, product: item.product }],
              totalAmount: balance.amount,
              totalAmountUsd: balance.amountUsd || "0",
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
