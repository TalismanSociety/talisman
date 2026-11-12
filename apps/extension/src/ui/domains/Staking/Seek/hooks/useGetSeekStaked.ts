import { isAccountAddressEthereum } from "@core/domains/keyring/exports"
import { BalanceFormatter } from "@talismn/balances"
import { useQuery } from "@tanstack/react-query"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useAccounts } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { useMemo } from "react"

import { readSeekStaked } from "../utils/seekDiscount"

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
  const ethAccounts = useMemo(() => accounts.filter(isAccountAddressEthereum), [accounts])
  const { stakingContractNetworkId, stakingContractAddress } = remoteConfig.seek
  const publicClient = usePublicClient(stakingContractNetworkId)
  const token = useToken(remoteConfig.seek.tokenId)

  const tokenDecimals = token?.decimals || 18

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["useGetSeekStaked", stakingContractNetworkId, ethAccounts.map((a) => a.address)],
    queryFn: async () => {
      if (!publicClient || ethAccounts.length === 0) return []

      return readSeekStaked(
        publicClient,
        stakingContractAddress,
        ethAccounts.map((account) => account.address)
      )
    },
    enabled: !!publicClient && ethAccounts.length > 0,
    refetchInterval: 60_000,
  })

  const balances = useMemo(
    () =>
      data
        ? ethAccounts.map((account, i) => ({
            address: account.address,
            balance: new BalanceFormatter(data[i] || 0n, tokenDecimals),
          }))
        : [],
    [data, ethAccounts, tokenDecimals]
  )
  const totalStakedAmount = useMemo(
    () => balances.reduce((total, account) => total + account.balance.planck, 0n),
    [balances]
  )

  const totalStaked = useMemo(
    () => new BalanceFormatter(totalStakedAmount, tokenDecimals),
    [totalStakedAmount, tokenDecimals]
  )

  return { data: { balances, totalStaked }, isLoading, isError, refetch }
}
