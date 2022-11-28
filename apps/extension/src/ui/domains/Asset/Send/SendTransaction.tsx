import { TransactionProgress } from "@ui/domains/Transaction/TransactionProgress"

import { useSendTokens } from "./context"
import { useSendTokensModal } from "./SendTokensModalContext"

export const SendTransaction = () => {
  const { transactionId, transactionHash, transferableToken } = useSendTokens()
  const { close } = useSendTokensModal()

  return (
    <TransactionProgress
      evmNetworkId={transferableToken?.evmNetworkId}
      evmTxHash={transactionHash}
      substrateTxId={transactionId}
      handleClose={close}
    />
  )
}
