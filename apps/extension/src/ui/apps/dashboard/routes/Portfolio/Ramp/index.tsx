import { Navigate, Route, Routes } from "react-router-dom"

import { RampForm } from "@ui/domains/Ramp/RampForm"

export const RampRoutes = () => {
  return (
    <Routes>
      <Route path="*" element={<Navigate to="buy" />} />
      <Route path="buy" element={<RampForm formType="buy" />} />
      <Route path="sell" element={<RampForm formType="sell" />} />
    </Routes>
  )
}
