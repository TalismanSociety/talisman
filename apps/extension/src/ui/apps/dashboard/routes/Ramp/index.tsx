import { Navigate, Route, Routes } from "react-router-dom"

export const RampRoutes = () => {
  const RampBuy = () => {
    return <div>Buy</div>
  }

  const RampSell = () => {
    return <div>Sell</div>
  }

  return (
    <Routes>
      <Route path="*" element={<Navigate to="buy" />} />
      <Route path="buy" element={<RampBuy />} />
      <Route path="sell" element={<RampSell />} />
    </Routes>
  )
}
