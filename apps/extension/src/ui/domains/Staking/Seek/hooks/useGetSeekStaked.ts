import { useQuery } from "@tanstack/react-query"
import { isAccountAddressEthereum } from "extension-core"
import { formatUnits } from "viem"

import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useAccounts } from "@ui/state"

import { CHAIN_ID, DECIMALS, DEEK_SINGLE_POOL_STAKING_ADDRESS } from "../constants"
import seekSinglePoolStakingAbi from "../seekSinglePoolStakingAbi"

export const useGetSeekStaked = (): {
  data: {
    balances: {
      address: string
      amount: bigint
      amountFormatted: string
    }[]
    totalStaked: {
      amount: bigint
      amountFormatted: string
    }
  }
  isLoading: boolean
  isError: boolean
  refetch: () => void
} => {
  const accounts = useAccounts("owned")
  const ethAccounts = accounts.filter(isAccountAddressEthereum)
  const publicClient = usePublicClient(CHAIN_ID.toString())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["useGetSeekStaked", CHAIN_ID, ethAccounts.map((a) => a.address)],
    queryFn: async () => {
      if (!publicClient || ethAccounts.length === 0) return []

      // Batch all balanceOf calls using Promise.all
      const balancePromises = ethAccounts.map(async (account) => {
        try {
          const balance = await publicClient.readContract({
            address: DEEK_SINGLE_POOL_STAKING_ADDRESS,
            abi: seekSinglePoolStakingAbi,
            functionName: "balanceOf",
            args: [account.address],
          })
          return balance as bigint
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to fetch balance for ${account.address}:`, error)
          return 0n
        }
      })

      return Promise.all(balancePromises)
    },
    enabled: !!publicClient && ethAccounts.length > 0,
    refetchInterval: 60_000,
  })

  const balances = data
    ? ethAccounts.map((account, i) => ({
        address: account.address,
        amount: data[i] || 0n,
        amountFormatted: formatUnits(data[i] || 0n, DECIMALS),
      }))
    : []

  const totalStakedAmount = balances.reduce((total, account) => total + account.amount, 0n)

  const totalStaked = {
    amount: totalStakedAmount,
    amountFormatted: formatUnits(totalStakedAmount, DECIMALS),
  }

  return { data: { balances, totalStaked }, isLoading, isError, refetch }
}
