import { useEffect, useMemo } from "react"
import { Route, Routes, Navigate, useNavigate } from "react-router-dom"
import Loading from "./pages/Loading"
import Login from "./pages/Login"
import Account from "./pages/Account"
import Connect from "./pages/Connect"
import { SignRequest } from "./pages/Sign"
import { EthSignRequest } from "./pages/Sign/ethereum"
import Metadata from "./pages/Metadata"
import { CurrentSiteProvider } from "./context/CurrentSiteContext"
import { NavigationProvider } from "./context/NavigationContext"
import { useMetadataRequests } from "@ui/hooks/useMetadataRequests"
import { useAuthRequests } from "@ui/hooks/useAuthRequests"
import { useSigningRequests } from "@ui/hooks/useSigningRequests"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { api } from "@ui/api"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { isEthereumRequest } from "@core/util/isEthereumRequest"
import { AddEthereumNetwork } from "./pages/AddEthereumNetwork"
import { useEthNetworkAddRequests } from "@ui/hooks/useEthNetworkAddRequests"
import { AddressFormatterModalProvider } from "@ui/domains/Account/AddressFormatterModal"

const Popup = () => {
  const isOnboarded = useIsOnboarded()
  const isLoggedIn = useIsLoggedIn()
  const metaDataRequests = useMetadataRequests()
  const signingRequests = useSigningRequests()
  const authRequests = useAuthRequests()
  const ethNetworkAddRequests = useEthNetworkAddRequests()
  const navigate = useNavigate()

  // determine route based on the incoming message
  // push to correct route
  useEffect(() => {
    if (authRequests.length > 0) navigate("/auth")
    else if (ethNetworkAddRequests.length > 0) navigate("/eth-network-add")
    else if (metaDataRequests.length > 0) navigate("/metadata")
    else if (signingRequests.length > 0) {
      const params = new URL(window.location.href).searchParams
      const signingId = params.get("signing")
      const request = signingRequests.find((r) => r.id === signingId) ?? signingRequests[0]
      if (request) {
        if (isEthereumRequest(request)) navigate(`/sign/eth/${request.id}`)
        else navigate(`/sign/${request.id}`)
      }
    } else navigate("/")
    // dependency on signingRequests because it's mutable
    // otherwise it wouldn't switch to a pending request after approving another
  }, [
    metaDataRequests,
    signingRequests,
    authRequests,
    navigate,
    ethNetworkAddRequests,
    signingRequests.length,
  ])

  // force onboarding if not onboarded
  useEffect(() => {
    if (isOnboarded === "FALSE") {
      // give focus to the onboarding tab
      api.onboardOpen()
      // most browsers automatically close the extension popup when giving focus to the onboarding tab
      // but on firefox, we need to close the window explicitely
      window.close()
    }
  }, [isOnboarded])

  // display loading screen until we have onboarding and authentication statuses
  const isLoading = useMemo(
    () => [isLoggedIn, isOnboarded].includes("UNKNOWN"),
    [isLoggedIn, isOnboarded]
  )

  if (isLoading) return <Loading />

  if (isLoggedIn === "FALSE") return <Login />

  return (
    <CurrentSiteProvider>
      <NavigationProvider>
        <AddressFormatterModalProvider>
          <Routes>
            <Route path="/" element={<Account />}></Route>
            <Route path="auth" element={<Connect />}></Route>
            <Route path="sign/eth/:id" element={<EthSignRequest />}></Route>
            <Route path="sign/:id" element={<SignRequest />}></Route>
            <Route path="metadata" element={<Metadata />}></Route>
            <Route path="eth-network-add" element={<AddEthereumNetwork />}></Route>
            {/* Not used for now */}
            {/* <Route path="tx/:id" element={<Transaction />}></Route> */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AddressFormatterModalProvider>
      </NavigationProvider>
    </CurrentSiteProvider>
  )
}

export default Popup
