import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { Suspense, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { MysticalBackground } from "talisman-ui"

import Context from "./context"
import OnboardingRoutes from "./routes"

const Onboarding = () => {
  const params = useSearchParams()[0]
  const resetWallet = params.get("resetWallet")
  // use a ref here because the param won't be here after the first navigation event
  const resetWalletRef = useRef(resetWallet === "true")

  return (
    <Suspense fallback={<SuspenseTracker name="Onboard" />}>
      <Context resetWallet={resetWalletRef.current}>
        <MysticalBackground className="fixed left-0 top-0 h-[100vh] w-[100vw]" />
        <OnboardingRoutes />
      </Context>
    </Suspense>
  )
}
export default Onboarding
