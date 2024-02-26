import { balancesByAccountCategoryAtomFamily, balancesHydrateAtom } from "@ui/atoms"
import { SendFundsProvider } from "@ui/domains/SendFunds/useSendFunds"
import { atom, useAtomValue } from "jotai"
import { Route, Routes } from "react-router-dom"

import { SendFundsWizardProvider } from "./context"
import { SendFundsAmount } from "./SendFundsAmount"
import { SendFundsConfirm } from "./SendFundsConfirm"
import { SendFundsFrom } from "./SendFundsFrom"
import { SendFundsRedirect } from "./SendFundsRedirect"
import { SendFundsSubmitted } from "./SendFundsSubmitted"
import { SendFundsTo } from "./SendFundsTo"
import { SendFundsToken } from "./SendFundsToken"

const preloadAtom = atom((get) =>
  Promise.all([get(balancesHydrateAtom), get(balancesByAccountCategoryAtomFamily("all"))])
)

export const SendFundsPage = () => {
  useAtomValue(preloadAtom)

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
