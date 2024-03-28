import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import useTokens from "@ui/hooks/useTokens"
import { Suspense, useRef } from "react"
import { useSearchParams } from "react-router-dom"

import { OnboardBackground } from "./components/OnboardBackground"
import Context from "./context"
import OnboardingRoutes from "./routes"

const HydrateFromChaindata = () => {
  // Loading tokens will cause backend to fetch latest chain/evmNetworks/tokens from github
  // Additionally it will update chains's metadata if necessary
  // This allows displaying balances much faster if user attempts to import accounts later during the onboarding
  useTokens({ activeOnly: true, includeTestnets: false })

  return null
}

const Onboarding = () => {
  const params = useSearchParams()[0]
  const resetWallet = params.get("resetWallet")
  // use a ref here because the param won't be here after the first navigation event
  const resetWalletRef = useRef(resetWallet === "true")

  return (
    <Context resetWallet={resetWalletRef.current}>
      <OnboardBackground />
      <div className="h-dvh w-dvw overflow-auto">
        <OnboardingRoutes />
      </div>
      <Suspense fallback={<SuspenseTracker name="HydrateFromChaindata" />}>
        <HydrateFromChaindata />
      </Suspense>
    </Context>
  )
}
export default Onboarding
