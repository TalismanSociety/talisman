import { bind } from "@react-rxjs/core"
import { Route, Routes } from "react-router-dom"
import { combineLatest } from "rxjs"

import { SendFundsProvider } from "@ui/domains/SendFunds/useSendFunds"
import { accounts$, balancesHydrate$, contacts$ } from "@ui/state"

import { SendFundsWizardProvider } from "./context"
import { SendFundsAmount } from "./SendFundsAmount"
import { SendFundsConfirm } from "./SendFundsConfirm"
import { SendFundsFrom } from "./SendFundsFrom"
import { SendFundsRedirect } from "./SendFundsRedirect"
import { SendFundsSubmitted } from "./SendFundsSubmitted"
import { SendFundsTo } from "./SendFundsTo"
import { SendFundsToken } from "./SendFundsToken"

const [usePreload] = bind(combineLatest([balancesHydrate$, accounts$, contacts$]))

export const SendFundsPage = () => {
  usePreload()

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
