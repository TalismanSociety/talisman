import { isEthereumAddress } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { PublicClient } from "viem"

import { EvmAddress } from "@extension/core"

export const useEthBalance = (
  publicClient: PublicClient | undefined,
  address: EvmAddress | undefined,
) => {
  const { data: balance, ...rest } = useQuery({
    queryKey: ["useEthBalance", publicClient?.chain?.id, address],
    queryFn: () => {
      if (!publicClient || !isEthereumAddress(address)) return null
      return publicClient.getBalance({ address })
    },
    refetchInterval: 12_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!publicClient?.chain?.id && isEthereumAddress(address),
  })

  return { balance, ...rest }
}
