import { SendFundsTokenPicker } from "@ui/domains/SendFunds/SendFundsTokenPicker"

import { SendFundsLayout } from "./SendFundsLayout"

export const SendFundsToken = () => {
  return (
    <SendFundsLayout title="Select a token">
      <SendFundsTokenPicker />
    </SendFundsLayout>
  )
}
