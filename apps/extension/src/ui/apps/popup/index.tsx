import { ENCRYPT_ENCRYPT_PREFIX } from "@core/domains/encrypt/types"
import { ETH_NETWORK_ADD_PREFIX, WATCH_ASSET_PREFIX } from "@core/domains/ethereum/types"
import { METADATA_PREFIX } from "@core/domains/metadata/types"
import { SIGNING_TYPES } from "@core/domains/signing/types"
import { AUTH_PREFIX } from "@core/domains/sitesAuthorised/types"
import { FadeIn } from "@talisman/components/FadeIn"
import { api } from "@ui/api"
import {
  AccountExportModal,
  AccountExportModalProvider,
} from "@ui/domains/Account/AccountExportModal"
import {
  AccountExportPrivateKeyModal,
  AccountExportPrivateKeyModalProvider,
} from "@ui/domains/Account/AccountExportPrivateKeyModal"
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
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"

import { CurrentSiteProvider } from "./context/CurrentSiteContext"
import { NavigationProvider } from "./context/NavigationContext"
import { AddCustomErc20Token } from "./pages/AddCustomErc20Token"
import { AddEthereumNetwork } from "./pages/AddEthereumNetwork"
import { Connect } from "./pages/Connect"
import { Encrypt } from "./pages/Encrypt"
import { LoginViewManager } from "./pages/Login"
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

  // detect any pending requests and redirect to the appropriate page
  useEffect(() => {
    if (authRequests.length) {
      navigate(`/${AUTH_PREFIX}/${authRequests[0].id}`)
    } else if (ethNetworkAddRequests.length) {
      navigate(`/${ETH_NETWORK_ADD_PREFIX}/${ethNetworkAddRequests[0].id}`)
    } else if (ethWatchAssetRequests.length) {
      navigate(`/${WATCH_ASSET_PREFIX}/${ethWatchAssetRequests[0].id}`)
    } else if (metaDataRequests.length) {
      navigate(`/${METADATA_PREFIX}/${metaDataRequests[0].id}`)
    } else if (signingRequests.length) {
      const req = signingRequests[0]
      navigate(`/${req.type}/${req.id}`)
    } else if (encryptRequests.length) {
      navigate(`/${ENCRYPT_ENCRYPT_PREFIX}/${encryptRequests[0].id}`)
    }
  }, [
    authRequests,
    encryptRequests,
    ethNetworkAddRequests,
    ethWatchAssetRequests,
    metaDataRequests,
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

  if (isLoggedIn === "FALSE") return <LoginViewManager />

  return (
    // TODO implement layout here to prevent container flickering on route change (some routes render null until loaded)
    // workaround set size here
    // also use a fade-in to reduce flickering from portfolio to request page when opening
    <FadeIn className="mx-auto h-[60rem] w-[40rem]">
      {/* only embedded popup should auto redirect to pending requests */}
      {isEmbeddedPopup && <PendingRequestRedirect />}
      <SelectedAccountProvider isPopup>
        <AccountRemoveModalProvider>
          <AccountRenameModalProvider>
            <AccountExportPrivateKeyModalProvider>
              <AccountExportModalProvider>
                <CurrentSiteProvider>
                  <NavigationProvider>
                    <AddressFormatterModalProvider>
                      <Routes>
                        <Route path="portfolio/*" element={<Portfolio />}></Route>
                        <Route path={`${AUTH_PREFIX}/:id`} element={<Connect />}></Route>
                        <Route
                          path={`${SIGNING_TYPES.ETH_SIGN}/:id`}
                          element={<EthereumSignRequest />}
                        ></Route>
                        <Route
                          path={`${SIGNING_TYPES.SUBSTRATE_SIGN}/:id`}
                          element={<SubstrateSignRequest />}
                        ></Route>
                        <Route path={`${METADATA_PREFIX}/:id`} element={<Metadata />}></Route>
                        <Route path={`${ENCRYPT_ENCRYPT_PREFIX}/:id`} element={<Encrypt />}></Route>
                        <Route
                          path={`${ETH_NETWORK_ADD_PREFIX}/:id`}
                          element={<AddEthereumNetwork />}
                        ></Route>
                        <Route
                          path={`${WATCH_ASSET_PREFIX}/:id`}
                          element={<AddCustomErc20Token />}
                        ></Route>
                        <Route path="*" element={<Navigate to="/portfolio" replace />} />
                      </Routes>
                      <AccountRenameModal />
                      <AccountRemoveModal />
                      <AccountExportModal />
                      <AccountExportPrivateKeyModal />
                    </AddressFormatterModalProvider>
                  </NavigationProvider>
                </CurrentSiteProvider>
              </AccountExportModalProvider>
            </AccountExportPrivateKeyModalProvider>
          </AccountRenameModalProvider>
        </AccountRemoveModalProvider>
      </SelectedAccountProvider>
    </FadeIn>
  )
}

export default Popup
