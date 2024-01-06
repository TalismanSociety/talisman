import { ENCRYPT_DECRYPT_PREFIX, ENCRYPT_ENCRYPT_PREFIX } from "@core/domains/encrypt/types"
import { ETH_NETWORK_ADD_PREFIX, WATCH_ASSET_PREFIX } from "@core/domains/ethereum/types"
import { METADATA_PREFIX } from "@core/domains/metadata/types"
import { SIGNING_TYPES } from "@core/domains/signing/types"
import { AUTH_PREFIX } from "@core/domains/sitesAuthorised/types"
import { FadeIn } from "@talisman/components/FadeIn"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { api } from "@ui/api"
import { AccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { AccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { AccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { AccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { CopyAddressModal } from "@ui/domains/CopyAddress"
import { DatabaseErrorAlert } from "@ui/domains/Settings/DatabaseErrorAlert"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useIsOnboarded } from "@ui/hooks/useIsOnboarded"
import { Suspense, useEffect } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { BackupWarningDrawer } from "./components/BackupWarningDrawer"
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
    if (!isOnboarded) {
      // give focus to the onboarding tab
      api.onboardOpen()
      // most browsers automatically close the extension popup when giving focus to the onboarding tab
      // but on firefox, we need to close the window explicitely
      window.close()
    }
  }, [isOnboarded])

  if (!isLoggedIn) return <LoginViewManager />

  return (
    <FadeIn className="h-full w-full">
      <Suspense fallback={<SuspenseTracker name="Routes" />}>
        <Routes>
          <Route path="portfolio/*" element={<Portfolio />} />
          <Route path={`${AUTH_PREFIX}/:id`} element={<Connect />} />
          <Route path={`${SIGNING_TYPES.ETH_SIGN}/:id`} element={<EthereumSignRequest />} />
          <Route path={`${SIGNING_TYPES.ETH_SEND}/:id`} element={<EthereumSignRequest />} />
          <Route path={`${SIGNING_TYPES.SUBSTRATE_SIGN}/:id`} element={<SubstrateSignRequest />} />
          <Route path={`${METADATA_PREFIX}/:id`} element={<Metadata />} />
          <Route path={`${ENCRYPT_ENCRYPT_PREFIX}/:id`} element={<Encrypt />} />
          <Route path={`${ENCRYPT_DECRYPT_PREFIX}/:id`} element={<Encrypt />} />
          <Route path={`${ETH_NETWORK_ADD_PREFIX}/:id`} element={<AddEthereumNetwork />} />
          <Route path={`${WATCH_ASSET_PREFIX}/:id`} element={<AddCustomErc20Token />} />
          <Route path="send/*" element={<SendFundsPage />} />
          <Route path="*" element={<Navigate to="/portfolio" replace />} />
        </Routes>
      </Suspense>

      <Suspense fallback={<SuspenseTracker name="Modals & alerts" />}>
        <AccountRenameModal />
        <AccountRemoveModal />
        <AccountExportModal />
        <AccountExportPrivateKeyModal />
        <CopyAddressModal />
        <DatabaseErrorAlert container="popup" />
        <BackupWarningDrawer />
      </Suspense>
    </FadeIn>
  )
}

const Popup = () => (
  // <Suspense fallback={<SuspenseTracker name="Popup" />}>
  <InnerPopup />
  //</Suspense>
)

export default Popup
