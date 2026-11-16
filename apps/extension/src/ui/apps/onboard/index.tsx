import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { useTokens } from "@ui/state/chaindata"
import { Suspense } from "react"

import { OnboardBackground } from "./components/OnboardBackground"
import Context from "./context"
import OnboardingRoutes from "./routes"

const HydrateFromChaindata = () => {
  // Loading tokens will cause backend to fetch latest chain/evmNetworks/tokens from github
  // Additionally it will update chains's metadata if necessary
  // This allows displaying balances much faster after onboarding is finished
  useTokens({ activeOnly: true, includeTestnets: false })

  return null
}

const Onboarding = () => {
  return (
    <Context>
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
