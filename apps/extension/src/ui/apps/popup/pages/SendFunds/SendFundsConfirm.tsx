import { SendFundsConfirmForm } from "@ui/domains/SendFunds/SendFundsConfirmForm"

import { SendFundsLayout } from "./SendFundsLayout"

export const SendFundsConfirm = () => {
  return (
    <SendFundsLayout withBackLink title="Confirm">
      <SendFundsConfirmForm />
    </SendFundsLayout>
  )
}
