import { Route, Routes } from "react-router-dom"

import { WithdrawWizardProvider } from "@ui/domains/Earn/context/WithdrawWizardContext"

import { WithdrawAccountPage } from "./WithdrawAccountPage"
import { WithdrawAmountPage } from "./WithdrawAmountPage"
import { WithdrawConfirmPage } from "./WithdrawConfirmPage"
import { WithdrawSubmitted } from "./WithdrawSubmitted"
import { WithdrawTokenPage } from "./WithdrawTokenPage"

export const WithdrawPage = () => {
  return (
    <WithdrawWizardProvider>
      <Routes>
        <Route path="account" element={<WithdrawAccountPage />} />
        <Route path="token" element={<WithdrawTokenPage />} />
        <Route path="amount" element={<WithdrawAmountPage />} />
        <Route path="confirm" element={<WithdrawConfirmPage />} />
        <Route path="submitted" element={<WithdrawSubmitted />} />
      </Routes>
    </WithdrawWizardProvider>
  )
}
