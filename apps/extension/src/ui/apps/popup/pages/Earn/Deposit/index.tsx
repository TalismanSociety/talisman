import { bind } from "@react-rxjs/core"
import { Route, Routes } from "react-router-dom"
import { combineLatest } from "rxjs"

import { DepositWizardProvider } from "@ui/domains/Staking/Earn/context/DepositWizardContext"
import { accounts$, balancesHydrate$, contacts$ } from "@ui/state"

import { DepositAmount } from "../DepositAmount"
import { DepositConfirm } from "../DepositConfirm"

const [usePreload] = bind(combineLatest([balancesHydrate$, accounts$, contacts$]))

export const DepositPage = () => {
  usePreload()

  return (
    <DepositWizardProvider>
      <Routes>
        <Route path="amount" element={<DepositAmount />} />
        <Route path="confirm" element={<DepositConfirm />} />
        <Route path="*" element={<DepositAmount />} />
      </Routes>
    </DepositWizardProvider>
  )
}
