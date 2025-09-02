import { isAccountAddressEthereum } from "extension-core"
import { formatUnits } from "viem"
import { useReadContracts } from "wagmi"

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

  const { data, isLoading, isError, refetch } = useReadContracts({
    allowFailure: false,
    contracts: ethAccounts.map((a) => ({
      address: DEEK_SINGLE_POOL_STAKING_ADDRESS,
      abi: seekSinglePoolStakingAbi,
      functionName: "balanceOf",
      args: [a.address],
      chainId: CHAIN_ID,
      enable: ethAccounts.length > 0,
    })),
    query: { refetchInterval: 60_000 },
  })

  const balances = data
    ? ethAccounts.map((account, i) => ({
        address: account.address,
        amount: (data[i] as bigint) || 0n,
        amountFormatted: formatUnits((data[i] as bigint) || 0n, DECIMALS),
      }))
    : []

  const totalStakedAmount = balances.reduce((total, account) => total + account.amount, 0n)

  const totalStaked = {
    amount: totalStakedAmount,
    amountFormatted: formatUnits(totalStakedAmount, DECIMALS),
  }

  return { data: { balances, totalStaked }, isLoading, isError, refetch }
}
