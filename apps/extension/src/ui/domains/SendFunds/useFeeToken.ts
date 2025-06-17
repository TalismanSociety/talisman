import { useMemo } from "react"

import { useChain, useEvmNetwork, useToken } from "@ui/state"

export const useFeeToken = (tokenId?: string | null) => {
  const token = useToken(tokenId)
  const chain = useChain(token?.networkId)
  const evmNetwork = useEvmNetwork(token?.networkId)

  const feeTokenId = useMemo(() => {
    if (!token) return null

    // TODO reintroduce below insanity
    //if (typeof chain?.feeToken === "string") return chain.feeToken

    switch (token.type) {
      case "evm-uniswapv2":
      case "evm-erc20":
      case "evm-native":
        return evmNetwork?.nativeTokenId
      case "substrate-assets":
      case "substrate-foreignassets":
      case "substrate-native":
      case "substrate-psp22":
      case "substrate-tokens":
        return chain?.nativeTokenId
    }
  }, [chain?.nativeTokenId, evmNetwork?.nativeTokenId, token])

  return useToken(feeTokenId)
}
