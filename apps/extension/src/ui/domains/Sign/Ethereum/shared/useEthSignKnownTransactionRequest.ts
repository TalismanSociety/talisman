import { DecodedEvmTransaction } from "@ui/domains/Ethereum/util/decodeEvmTransaction"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"

// only call this hook from known contracts (ERC20, ERC721...) display components
export const useEthSignKnownTransactionRequest = () => {
  const { decodedTx, ...rest } = useEthSignTransactionRequest()

  return {
    decodedTx: decodedTx as DecodedEvmTransaction,
    ...rest,
  }
}
