import { NetworkInfoProps, useNetworkInfo } from "@ui/hooks/useNetworkInfo"

export const useNetworkCategory = ({ chain, evmNetwork, relay }: NetworkInfoProps) => {
  const networkInfo = useNetworkInfo({ chain, evmNetwork, relay })
  return networkInfo.type ?? null
}
