import { isEthereumRequest } from "@core/util/isEthereumRequest"
import { FadeIn } from "@talisman/components/FadeIn"
import { api } from "@ui/api"
import {
  AccountExportModal,
  AccountExportModalProvider,
} from "@ui/domains/Account/AccountExportModal"
import {
  AccountRemoveModal,
  AccountRemoveModalProvider,
} from "@ui/domains/Account/AccountRemoveModal"
import {
  AccountRenameModal,
  AccountRenameModalProvider,
} from "@ui/domains/Account/AccountRenameModal"
import { AddressFormatterModalProvider } from "@ui/domains/Account/AddressFormatterModal"
import { SelectedAccountProvider } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useAuthRequests } from "@ui/hooks/useAuthRequests"
import { useEncryptRequests } from "@ui/hooks/useEncryptRequests"
import { useEthNetworkAddRequests } from "@ui/hooks/useEthNetworkAddRequests"
import { useEthWatchAssetRequests } from "@ui/hooks/useEthWatchAssetRequests"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { useMetadataRequests } from "@ui/hooks/useMetadataRequests"
import { useSigningRequests } from "@ui/hooks/useSigningRequests"
import { useEffect, useMemo } from "react"
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"

import { CurrentSiteProvider } from "./context/CurrentSiteContext"
import { NavigationProvider } from "./context/NavigationContext"
import { AddCustomErc20Token } from "./pages/AddCustomErc20Token"
import { AddEthereumNetwork } from "./pages/AddEthereumNetwork"
import { Connect } from "./pages/Connect"
import { Encrypt } from "./pages/Encrypt"
import { Login } from "./pages/Login"
import { Metadata } from "./pages/Metadata"
import { Portfolio } from "./pages/Portfolio"
import { EthereumSignRequest } from "./pages/Sign/ethereum"
import { SubstrateSignRequest } from "./pages/Sign/substrate"

const PendingRequestRedirect = () => {
  const metaDataRequests = useMetadataRequests()
  const encryptRequests = useEncryptRequests()
  const signingRequests = useSigningRequests()
  const authRequests = useAuthRequests()
  const ethNetworkAddRequests = useEthNetworkAddRequests()
  const ethWatchAssetRequests = useEthWatchAssetRequests()
  const navigate = useNavigate()
  const location = useLocation()

  // detect any pending requests and redirect to the appropriate page
  useEffect(() => {
    if (authRequests.length > 0) navigate("/auth")
    else if (ethNetworkAddRequests.length > 0)
      navigate(`/eth-network-add/${ethNetworkAddRequests[0].id}`)
    else if (ethWatchAssetRequests.length > 0) {
      const params = new URL(window.location.href).searchParams
      const reqId = params.get("customAsset")
      const request = ethWatchAssetRequests.find((r) => r.id === reqId) ?? ethWatchAssetRequests[0]
      if (request) navigate(`/eth-watchasset/${request.id}`)
    } else if (metaDataRequests.length > 0) navigate("/metadata")
    else if (signingRequests.length > 0) {
      const params = new URL(window.location.href).searchParams
      const signingId = params.get("signing")
      const request = signingRequests.find((r) => r.id === signingId) ?? signingRequests[0]
      if (request) {
        if (isEthereumRequest(request)) navigate(`/sign/eth/${request.id}`)
        else navigate(`/sign/${request.id}`)
      }
    } else if (encryptRequests.length > 0) {
      const params = new URL(window.location.href).searchParams
      const reqId = params.get("encrypt")
      const request = encryptRequests.find((r) => r.id === reqId) ?? encryptRequests[0]
      if (request) navigate(`/encrypt/${request.id}`)
    }
  }, [
    authRequests.length,
    encryptRequests,
    ethNetworkAddRequests,
    ethNetworkAddRequests.length,
    ethWatchAssetRequests,
    location.pathname,
    metaDataRequests.length,
    navigate,
    signingRequests,
  ])

  return null
}

const Popup = () => {
  const isOnboarded = useIsOnboarded()
  const isLoggedIn = useIsLoggedIn()
  const isEmbeddedPopup = useMemo(() => document.documentElement.classList.contains("embedded"), [])

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

  // wait until we have onboarding and authentication statuses
  const isLoading = useMemo(
    () => [isLoggedIn, isOnboarded].includes("UNKNOWN"),
    [isLoggedIn, isOnboarded]
  )

  if (isLoading) return null

  if (isLoggedIn === "FALSE") return <Login />

  return (
    // TODO implement layout here to prevent container flickering on route change (some routes render null until loaded)
    // workaround set size here
    // also use a fade-in to reduce flickering from portfolio to request page when opening
    <FadeIn className="h-[60rem] w-[40rem]">
      {/* only embedded popup should auto redirect to pending requests */}
      {isEmbeddedPopup && <PendingRequestRedirect />}
      <SelectedAccountProvider isPopup>
        <AccountRemoveModalProvider>
          <AccountRenameModalProvider>
            <AccountExportModalProvider>
              <CurrentSiteProvider>
                <NavigationProvider>
                  <AddressFormatterModalProvider>
                    <Routes>
                      <Route path="portfolio/*" element={<Portfolio />}></Route>
                      <Route path="auth/:id" element={<Connect />}></Route>
                      <Route path="sign/eth/:id" element={<EthereumSignRequest />}></Route>
                      <Route path="sign/:id" element={<SubstrateSignRequest />}></Route>
                      <Route path="metadata/:id" element={<Metadata />}></Route>
                      <Route path="encrypt/:id" element={<Encrypt />}></Route>
                      <Route path="eth-network-add/:id" element={<AddEthereumNetwork />}></Route>
                      <Route path="eth-watchasset/:id" element={<AddCustomErc20Token />}></Route>
                      <Route path="*" element={<Navigate to="/portfolio" replace />} />
                    </Routes>
                    <AccountRenameModal />
                    <AccountRemoveModal />
                    <AccountExportModal />
                  </AddressFormatterModalProvider>
                </NavigationProvider>
              </CurrentSiteProvider>
            </AccountExportModalProvider>
          </AccountRenameModalProvider>
        </AccountRemoveModalProvider>
      </SelectedAccountProvider>
    </FadeIn>
  )
}

export default Popup
