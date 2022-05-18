import { Route, Routes, Navigate } from "react-router-dom"
import { Welcome } from "./Welcome"
import { Terms } from "./Terms"
import { Onboard } from "./Onboard"
import { EnterSecret } from "./EnterSecret"
import { EnterName } from "./EnterName"
import { EnterPass } from "./EnterPass"
import { Complete } from "./Complete"

const OnboardingRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="terms" element={<Terms />} />
      <Route path="onboard" element={<Onboard />} />
      <Route path="create">
        <Route path="secret" element={<EnterSecret />} />
        <Route path="name" element={<EnterName />} />
        <Route path="pass" element={<EnterPass />} />
      </Route>
      <Route path="complete" element={<Complete />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default OnboardingRoutes
