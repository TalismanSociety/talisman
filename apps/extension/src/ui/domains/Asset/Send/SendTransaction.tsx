import { useSendTokens } from "./context"
import { useSendTokensModal } from "./SendTokensModalContext"
import { TransactionProgress } from "./TransactionProgress"

export const SendTransaction = () => {
  const { transactionHash } = useSendTokens()
  const { close } = useSendTokensModal()

  return <TransactionProgress hash={transactionHash} onClose={close} />
}
