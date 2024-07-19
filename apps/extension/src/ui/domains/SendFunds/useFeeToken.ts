import { useMemo } from "react"

import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"

export const useFeeToken = (tokenId?: string | null) => {
  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)

  const feeTokenId = useMemo(() => {
    if (!token) return null

    if (typeof chain?.feeToken === "string") return chain.feeToken

    switch (token.type) {
      case "evm-erc20":
      case "evm-native":
      case "evm-uniswapv2":
        return evmNetwork?.nativeToken?.id
      case "substrate-assets":
      case "substrate-equilibrium":
      case "substrate-foreignassets":
      case "substrate-native":
      case "substrate-psp22":
      case "substrate-tokens":
        return chain?.nativeToken?.id
    }
  }, [chain?.feeToken, chain?.nativeToken?.id, evmNetwork?.nativeToken?.id, token])

  return useToken(feeTokenId)
}
