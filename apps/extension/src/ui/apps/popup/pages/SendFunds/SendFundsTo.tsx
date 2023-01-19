import { SendFundsRecipientPicker } from "@ui/domains/SendFunds/SendFundsRecipientPicker"

import { SendFundsLayout } from "./SendFundsLayout"

export const SendFundsTo = () => {
  return (
    <SendFundsLayout withBackLink title="Send to">
      <SendFundsRecipientPicker />
    </SendFundsLayout>
  )
}
