import { ENCRYPT_DECRYPT_PREFIX, ENCRYPT_ENCRYPT_PREFIX } from "@core/domains/encrypt/types"
import { ETH_NETWORK_ADD_PREFIX, WATCH_ASSET_PREFIX } from "@core/domains/ethereum/types"
import { METADATA_PREFIX } from "@core/domains/metadata/types"
import { SIGNING_TYPES } from "@core/domains/signing/types"
import { AUTH_PREFIX } from "@core/domains/sitesAuthorised/types"
import { KnownRequestTypes, ValidRequests } from "@core/libs/requests/types"
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
import { CopyAddressModal } from "@ui/domains/CopyAddress/CopyAddressModal"
import { CopyAddressModalProvider } from "@ui/domains/CopyAddress/useCopyAddressModal"
import { SelectedAccountProvider } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { useRequests } from "@ui/hooks/useRequests"
import { useEffect, useMemo } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"

import { BackupWarningDrawer } from "./components/BackupWarningDrawer"
import { CurrentSiteProvider } from "./context/CurrentSiteContext"
import { NavigationProvider } from "./context/NavigationContext"
import { AddCustomErc20Token } from "./pages/AddCustomErc20Token"
import { AddEthereumNetwork } from "./pages/AddEthereumNetwork"
import { Connect } from "./pages/Connect"
import { Encrypt } from "./pages/Encrypt"
import { LoginViewManager } from "./pages/Login"
import { Metadata } from "./pages/Metadata"
import { Portfolio } from "./pages/Portfolio"
import { SendFundsPage } from "./pages/SendFunds"
import { EthereumSignRequest } from "./pages/Sign/ethereum"
import { SubstrateSignRequest } from "./pages/Sign/substrate"

const PendingRequestRedirect = () => {
  const allRequests = useRequests()
  const navigate = useNavigate()

  // detect any pending requests and redirect to the appropriate page
  useEffect(() => {
    const requests = allRequests.reduce((result, req) => {
      if (!result[req.type]) result[req.type] = []
      result[req.type].push(req)
      return result
    }, {} as Record<KnownRequestTypes, ValidRequests[]>)

    if (requests.auth?.length) {
      navigate(`/${AUTH_PREFIX}/${requests.auth[0].id}`)
    } else if (requests["eth-network-add"]?.length) {
      navigate(`/${ETH_NETWORK_ADD_PREFIX}/${requests["eth-network-add"][0].id}`)
    } else if (requests["eth-watchasset"]?.length) {
      navigate(`/${WATCH_ASSET_PREFIX}/${requests["eth-watchasset"][0].id}`)
    } else if (requests.metadata?.length) {
      navigate(`/${METADATA_PREFIX}/${requests.metadata[0].id}`)
    } else if (requests["eth-send"]?.length) {
      const req = requests["eth-send"][0]
      navigate(`/${req.type}/${req.id}`)
    } else if (requests["eth-sign"]?.length) {
      const req = requests["eth-sign"][0]
      navigate(`/${req.type}/${req.id}`)
    } else if (requests["substrate-sign"]?.length) {
      const req = requests["substrate-sign"][0]
      navigate(`/${req.type}/${req.id}`)
    } else if (requests.encrypt?.length) {
      navigate(`/${ENCRYPT_ENCRYPT_PREFIX}/${requests.encrypt[0].id}`)
    } else if (requests.decrypt?.length) {
      navigate(`/${ENCRYPT_DECRYPT_PREFIX}/${requests.decrypt[0].id}`)
    }
  }, [allRequests, navigate])

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
                      <CopyAddressModalProvider>
                        <Routes>
                          <Route path="portfolio/*" element={<Portfolio />}></Route>
                          <Route path={`${AUTH_PREFIX}/:id`} element={<Connect />}></Route>
                          <Route
                            path={`${SIGNING_TYPES.ETH_SIGN}/:id`}
                            element={<EthereumSignRequest />}
                          ></Route>
                          <Route
                            path={`${SIGNING_TYPES.ETH_SEND}/:id`}
                            element={<EthereumSignRequest />}
                          ></Route>
                          <Route
                            path={`${SIGNING_TYPES.SUBSTRATE_SIGN}/:id`}
                            element={<SubstrateSignRequest />}
                          ></Route>
                          <Route path={`${METADATA_PREFIX}/:id`} element={<Metadata />}></Route>
                          <Route
                            path={`${ENCRYPT_ENCRYPT_PREFIX}/:id`}
                            element={<Encrypt />}
                          ></Route>
                          <Route
                            path={`${ENCRYPT_DECRYPT_PREFIX}/:id`}
                            element={<Encrypt />}
                          ></Route>
                          <Route
                            path={`${ETH_NETWORK_ADD_PREFIX}/:id`}
                            element={<AddEthereumNetwork />}
                          ></Route>
                          <Route
                            path={`${WATCH_ASSET_PREFIX}/:id`}
                            element={<AddCustomErc20Token />}
                          ></Route>
                          <Route path="send/*" element={<SendFundsPage />} />
                          <Route path="*" element={<Navigate to="/portfolio" replace />} />
                        </Routes>
                      </CopyAddressModalProvider>
                      <BackupWarningDrawer />
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
