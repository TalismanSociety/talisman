import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { useMemo } from "react"

export const useFeeToken = (tokenId?: string | null) => {
  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)

  const feeTokenId = useMemo(() => {
    if (!token) return null
    switch (token.type) {
      case "evm-erc20":
      case "evm-native":
        return evmNetwork?.nativeToken?.id
      case "substrate-native":
      case "substrate-orml":
      case "substrate-assets":
      case "substrate-equilibrium":
      case "substrate-tokens":
        // TODO some networks use a different token for fees (ex KINT)
        return chain?.nativeToken?.id
    }
  }, [chain?.nativeToken?.id, evmNetwork?.nativeToken?.id, token])

  return useToken(feeTokenId)
}
