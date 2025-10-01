import { bind } from "@react-rxjs/core"
import { Route, Routes } from "react-router-dom"
import { combineLatest } from "rxjs"

import { DepositWizardProvider } from "@ui/domains/Earn/context/DepositWizardContext"
import { accounts$, balancesHydrate$, contacts$ } from "@ui/state"

import { DepositAmount } from "../DepositAmount"
import { DepositConfirm } from "../DepositConfirm"
import { DepositProgress } from "../DepositProgress"

const [usePreload] = bind(combineLatest([balancesHydrate$, accounts$, contacts$]))

export const DepositPage = () => {
  usePreload()

  return (
    <DepositWizardProvider>
      <Routes>
        <Route path="amount" element={<DepositAmount />} />
        <Route path="confirm" element={<DepositConfirm />} />
        <Route path="progress" element={<DepositProgress />} />
        <Route path="*" element={<DepositAmount />} />
      </Routes>
    </DepositWizardProvider>
  )
}
