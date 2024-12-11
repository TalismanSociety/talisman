import { Navigate, Route, Routes } from "react-router-dom"

import { RampBuyForm } from "@ui/domains/Ramp/RampBuyForm"

export const RampRoutes = () => {
  const RampSell = () => {
    return <div>Sell</div>
  }

  return (
    <Routes>
      <Route path="*" element={<Navigate to="buy" />} />
      <Route path="buy" element={<RampBuyForm />} />
      <Route path="sell" element={<RampSell />} />
    </Routes>
  )
}
