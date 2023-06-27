import { ENCRYPT_DECRYPT_PREFIX, ENCRYPT_ENCRYPT_PREFIX } from "@core/domains/encrypt/types"
import { ETH_NETWORK_ADD_PREFIX, WATCH_ASSET_PREFIX } from "@core/domains/ethereum/types"
import { METADATA_PREFIX } from "@core/domains/metadata/types"
import { SIGNING_TYPES } from "@core/domains/signing/types"
import { AUTH_PREFIX } from "@core/domains/sitesAuthorised/types"
import { FadeIn } from "@talisman/components/FadeIn"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
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
import { CopyAddressModal, CopyAddressModalProvider } from "@ui/domains/CopyAddress"
import { SelectedAccountProvider } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { Suspense, useEffect, useMemo } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

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

const InnerPopup = () => {
  const isOnboarded = useIsOnboarded()
  const isLoggedIn = useIsLoggedIn()

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
    <FadeIn>
      <SelectedAccountProvider isPopup>
        <AccountRemoveModalProvider>
          <AccountRenameModalProvider>
            <AccountExportPrivateKeyModalProvider>
              <AccountExportModalProvider>
                <CurrentSiteProvider>
                  <NavigationProvider>
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
                        <Route path={`${ENCRYPT_ENCRYPT_PREFIX}/:id`} element={<Encrypt />}></Route>
                        <Route path={`${ENCRYPT_DECRYPT_PREFIX}/:id`} element={<Encrypt />}></Route>
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
                      <AccountRenameModal />
                      <AccountRemoveModal />
                      <AccountExportModal />
                      <AccountExportPrivateKeyModal />
                      <CopyAddressModal />
                    </CopyAddressModalProvider>
                  </NavigationProvider>
                </CurrentSiteProvider>
              </AccountExportModalProvider>
            </AccountExportPrivateKeyModalProvider>
          </AccountRenameModalProvider>
        </AccountRemoveModalProvider>
      </SelectedAccountProvider>
      <BackupWarningDrawer />
    </FadeIn>
  )
}

const Popup = () => (
  <div className="mx-auto h-[60rem] w-[40rem]">
    <Suspense fallback={<SuspenseTracker name="Popup" />}>
      <InnerPopup />
    </Suspense>
  </div>
)

export default Popup
