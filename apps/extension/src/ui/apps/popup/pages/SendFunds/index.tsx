import { balancesFilterQuery, balancesHydrateState } from "@ui/atoms"
import { SendFundsProvider } from "@ui/domains/SendFunds/useSendFunds"
import { useRecoilPreload } from "@ui/hooks/useRecoilPreload"
import { Route, Routes } from "react-router-dom"

import { SendFundsWizardProvider } from "./context"
import { SendFundsAmount } from "./SendFundsAmount"
import { SendFundsConfirm } from "./SendFundsConfirm"
import { SendFundsFrom } from "./SendFundsFrom"
import { SendFundsRedirect } from "./SendFundsRedirect"
import { SendFundsSubmitted } from "./SendFundsSubmitted"
import { SendFundsTo } from "./SendFundsTo"
import { SendFundsToken } from "./SendFundsToken"

export const SendFundsPage = () => {
  useRecoilPreload(balancesHydrateState, balancesFilterQuery("all"))

  return (
    <SendFundsWizardProvider>
      <SendFundsProvider>
        <Routes>
          <Route path="token" element={<SendFundsToken />} />
          <Route path="from" element={<SendFundsFrom />} />
          <Route path="to" element={<SendFundsTo />} />
          <Route path="amount" element={<SendFundsAmount />} />
          <Route path="confirm" element={<SendFundsConfirm />} />
          <Route path="submitted" element={<SendFundsSubmitted />} />
          <Route path="*" element={<SendFundsRedirect />} />
        </Routes>
      </SendFundsProvider>
    </SendFundsWizardProvider>
  )
}
