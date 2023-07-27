import { Navigate, Route, Routes } from "react-router-dom"

import { OnboardStageWrapper } from "../components/OnboardStageWrapper"
import { AddAccountPage } from "./AddAccount"
import { PasswordPage } from "./Password"
import { PrivacyPage } from "./Privacy"
import { WelcomePage } from "./Welcome"

const OnboardingRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route
        path="password"
        element={
          <OnboardStageWrapper stage={1}>
            <PasswordPage />
          </OnboardStageWrapper>
        }
      />
      <Route
        path="privacy"
        element={
          <OnboardStageWrapper stage={2}>
            <PrivacyPage />
          </OnboardStageWrapper>
        }
      />
      <Route
        path="account"
        element={
          <OnboardStageWrapper stage={3}>
            <AddAccountPage />
          </OnboardStageWrapper>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default OnboardingRoutes
