import { Navigate, Route, Routes } from "react-router-dom"

import { OnboardStageWrapper } from "../components/OnboardStageWrapper"
import { PasswordPage } from "./Password"
import { PrivacyPage } from "./Privacy"
import { SuccessPage } from "./Success"
import { WelcomePage } from "./Welcome"

const OnboardingRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="password" element={<OnboardStageWrapper stage={1} />}>
        <Route index element={<PasswordPage />} />
      </Route>
      <Route path="privacy" element={<OnboardStageWrapper stage={2} />}>
        <Route index element={<PrivacyPage />} />
      </Route>
      <Route path="success" element={<OnboardStageWrapper stage={3} />}>
        <Route index element={<SuccessPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default OnboardingRoutes
