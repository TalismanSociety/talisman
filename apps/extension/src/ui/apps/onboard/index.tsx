import { useRef } from "react"
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
    <Context resetWallet={resetWalletRef.current}>
      <MysticalBackground className="fixed top-0 left-0 h-[100vh] w-[100vw]" />
      <OnboardingRoutes />
    </Context>
  )
}
export default Onboarding
