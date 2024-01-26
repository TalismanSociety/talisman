import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { tokensMapQuery } from "@ui/atoms"
import { Suspense, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { useRecoilValue } from "recoil"

import { OnboardBackground } from "./components/OnboardBackground"
import Context from "./context"
import OnboardingRoutes from "./routes"

const HydrateFromChainData = () => {
  // Loading tokens will cause backend to fetch latest chain/evmNetworks/tokens from github
  // Additionally it will update chains's metadata if necessary
  // This allows displaying balances much faster if user attempts to import accounts later during the onboarding
  useRecoilValue(tokensMapQuery({ activeOnly: true, includeTestnets: false }))

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
      <OnboardingRoutes />
      <Suspense fallback={<SuspenseTracker name="HydrateFromChainData" />}>
        <HydrateFromChainData />
      </Suspense>
    </Context>
  )
}
export default Onboarding
