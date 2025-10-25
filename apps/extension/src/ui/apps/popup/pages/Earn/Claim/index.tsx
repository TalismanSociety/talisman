import { Suspense } from "react"
import { Route, Routes } from "react-router-dom"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { ClaimAmountPage } from "./ClaimAmountPage"
import { ClaimConfirmPage } from "./ClaimConfirmPage"

export const ClaimPage = () => {
  return (
    <Suspense fallback={<SuspenseTracker name="ClaimPage" />}>
      <Routes>
        <Route path="amount" element={<ClaimAmountPage />} />
        <Route path="confirm" element={<ClaimConfirmPage />} />
        <Route path="*" element={<ClaimAmountPage />} />
      </Routes>
    </Suspense>
  )
}
