import { TransactionProgress } from "@ui/domains/Transaction/TransactionProgress"

import { useSendTokens } from "./context"
import { useSendTokensModal } from "./SendTokensModalContext"

export const SendTransaction = () => {
  const { transactionHash } = useSendTokens()
  const { close } = useSendTokensModal()

  return <TransactionProgress hash={transactionHash} onClose={close} />
}
