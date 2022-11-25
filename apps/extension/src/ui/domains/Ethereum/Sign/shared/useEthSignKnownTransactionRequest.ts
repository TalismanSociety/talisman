import { KnownTransactionInfo } from "@core/util/getEthTransactionInfo"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"

// only call this hook from known contracts (ERC20, ERC721...) display components
export const useEthSignKnownTransactionRequest = () => {
  const { transactionInfo, ...rest } = useEthSignTransactionRequest()

  return {
    transactionInfo: transactionInfo as KnownTransactionInfo,
    ...rest,
  }
}
