import { isEthereumAddress } from "@talismn/crypto"
import { useQuery } from "@tanstack/react-query"
import { EvmAddress } from "extension-core"
import { PublicClient } from "viem"

export const useEthBalance = (
  publicClient: PublicClient | undefined,
  address: EvmAddress | undefined,
) => {
  const { data: balance, ...rest } = useQuery({
    queryKey: ["useEthBalance", publicClient?.chain?.id, address],
    queryFn: () => {
      if (!publicClient || !address || !isEthereumAddress(address)) return null
      return publicClient.getBalance({ address })
    },
    refetchInterval: 12_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!publicClient?.chain?.id && address && isEthereumAddress(address),
  })

  return { balance, ...rest }
}
