import { useQuery } from "@tanstack/react-query"
import { ethers } from "ethers"

export const useEthBalance = (
  provider: ethers.providers.JsonRpcProvider | undefined,
  address: string | undefined
) => {
  const { data: balance, ...rest } = useQuery({
    queryKey: ["balance", address],
    queryFn: () => {
      if (!provider || !address) return null
      return provider.getBalance(address)
    },
    enabled: !!provider && !!address,
  })

  return { balance, ...rest }
}
