import { useQuery } from "@tanstack/react-query"
import { ethers } from "ethers"

export const useEthBalance = (
  provider: ethers.providers.JsonRpcProvider | undefined,
  address: string | undefined
) => {
  const { data: balance, ...rest } = useQuery({
    queryKey: ["useEthBalance", provider?.network?.chainId, address],
    queryFn: () => {
      if (!provider || !address) return null
      return provider.getBalance(address)
    },
    refetchInterval: 12_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!provider?.network && !!address,
  })

  return { balance, ...rest }
}
