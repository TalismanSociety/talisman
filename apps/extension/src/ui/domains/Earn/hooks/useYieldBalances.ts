import { BalanceDto, TokenDto, YieldBalancesDtoWithProduct, YieldDto } from "extension-core"
import { useMemo } from "react"

import { useYieldRawBalances } from "@ui/state/yield"

export const useYieldBalances = () => {
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
