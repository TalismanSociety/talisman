import { SendFundsMainForm } from "@ui/domains/SendFunds/SendFundsMainForm"

import { SendFundsLayout } from "./SendFundsLayout"

export const SendFundsAmount = () => {
  return (
    <SendFundsLayout title="Send">
      <SendFundsMainForm />
    </SendFundsLayout>
  )
}
