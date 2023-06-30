import { Navigate, Route, Routes } from "react-router-dom"

// import { ImportPage } from "./Import"
// import { ImportMethodPage } from "./ImportMethod"
// import { ImportSeedPage } from "./ImportSeed"
import { OnboardingPage } from "./Onboarding"
import { PasswordPage } from "./Password"
import { PrivacyPage } from "./Privacy"
import { WelcomePage } from "./Welcome"

const OnboardingRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      {/* <Route path="import" element={<ImportPage />} />
      <Route path="import-method" element={<ImportMethodPage />} />
      <Route path="import-seed" element={<ImportSeedPage />} /> */}
      <Route path="password" element={<PasswordPage />} />
      <Route path="privacy" element={<PrivacyPage />} />
      <Route path="onboard" element={<OnboardingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default OnboardingRoutes
