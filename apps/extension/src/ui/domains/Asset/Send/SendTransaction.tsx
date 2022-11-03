import Transaction from "@ui/domains/Transaction"

import { useSendTokens } from "./context"
import { useSendTokensModal } from "./SendTokensModalContext"

export const SendTransaction = () => {
  const { transactionId, transactionHash, transferableToken } = useSendTokens()
  const { close } = useSendTokensModal()

  return (
    <Transaction.Detail
      evmNetworkId={transferableToken?.evmNetworkId}
      evmTxHash={transactionHash}
      substrateTxId={transactionId}
      handleClose={close}
    />
  )
}
