import Transaction from "@ui/domains/Transaction"
import { useSendTokens } from "./context"
import { useSendTokensModal } from "./SendTokensModalContext"

export const SendTransaction = () => {
  const { transactionId, showTransaction } = useSendTokens()
  const { close } = useSendTokensModal()

  if (!showTransaction) return null

  return <Transaction.Detail id={transactionId} handleClose={close} />
}
