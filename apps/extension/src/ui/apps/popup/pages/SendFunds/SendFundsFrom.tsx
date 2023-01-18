import { SendFundsAccountPicker } from "@ui/domains/SendFunds/SendFundsAccountPicker"

import { SendFundsLayout } from "./SendFundsLayout"

export const SendFundsFrom = () => {
  return (
    <SendFundsLayout title="Send from">
      <SendFundsAccountPicker />
    </SendFundsLayout>
  )
}
