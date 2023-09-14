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

    // TODO specific rules to put in chaindata
    switch (chain?.id) {
      case "mangata":
        return "mangata-substrate-tokens-mgx"
      case "kintsugi":
        return "kintsugi-substrate-orml-kint"
      case "interlay":
        return "interlay-substrate-orml-intr"
      case "equilibrium-polkadot":
        return "equilibrium-polkadot-substrate-equilibrium-eq"
      default:
        break
    }

    switch (token.type) {
      case "evm-erc20":
      case "evm-native":
        return evmNetwork?.nativeToken?.id
      case "substrate-native":
      case "substrate-orml":
      case "substrate-assets":
      case "substrate-tokens":
      case "substrate-psp22":
      case "substrate-equilibrium":
        return chain?.nativeToken?.id
    }
  }, [chain?.id, chain?.nativeToken?.id, evmNetwork?.nativeToken?.id, token])

  return useToken(feeTokenId)
}
