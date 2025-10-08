import { BalanceFormatter } from "@talismn/balances"
import { useQuery } from "@tanstack/react-query"
import { isAccountAddressEthereum } from "extension-core"

import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useAccounts, useRemoteConfig, useToken } from "@ui/state"

import seekSinglePoolStakingAbi from "../seekSinglePoolStakingAbi"

export const useGetSeekStaked = (): {
  data: {
    balances: {
      address: string
      balance: BalanceFormatter
    }[]
    totalStaked: BalanceFormatter
  }
  isLoading: boolean
  isError: boolean
  refetch: () => void
} => {
  const remoteConfig = useRemoteConfig()
  const accounts = useAccounts("owned")
  const ethAccounts = accounts.filter(isAccountAddressEthereum)
  const { stakingContractNetworkId, stakingContractAddress } = remoteConfig.seek
  const publicClient = usePublicClient(stakingContractNetworkId)
  const token = useToken(remoteConfig.seek.tokenId)

  const tokenDecimals = token?.decimals || 18

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["useGetSeekStaked", stakingContractNetworkId, ethAccounts.map((a) => a.address)],
    queryFn: async () => {
      if (!publicClient || ethAccounts.length === 0) return []

      // Batch all balanceOf calls using Promise.all
      const balancePromises = ethAccounts.map(async (account) => {
        try {
          const balance = await publicClient.readContract({
            address: stakingContractAddress,
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
        balance: new BalanceFormatter(data[i] || 0n, tokenDecimals),
      }))
    : []

  const totalStakedAmount = balances.reduce((total, account) => total + account.balance.planck, 0n)

  const totalStaked = new BalanceFormatter(totalStakedAmount, tokenDecimals)

  return { data: { balances, totalStaked }, isLoading, isError, refetch }
}
