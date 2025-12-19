import {
  AUTH_PREFIX,
  AUTH_SOL_SIGN_IN_PREFIX,
  ENCRYPT_DECRYPT_PREFIX,
  ENCRYPT_ENCRYPT_PREFIX,
  ETH_NETWORK_ADD_PREFIX,
  METADATA_PREFIX,
  SIGNING_TYPES,
  WATCH_ASSET_PREFIX,
} from "extension-core"
import { Suspense, useEffect } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { FadeIn } from "@talisman/components/FadeIn"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { api } from "@ui/api"
import { AccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { AccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { AccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { AccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { CopyAddressModal } from "@ui/domains/CopyAddress"
import { SeekBenefitsModal } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsModal"
import { RampsModal } from "@ui/domains/Ramps/RampsModal"
import { DatabaseErrorAlert } from "@ui/domains/Settings/DatabaseErrorAlert"
import { BittensorBondModal } from "@ui/domains/Staking/Bittensor/BittensorBondModal"
import { BittensorClaimSettingsModal } from "@ui/domains/Staking/Bittensor/BittensorClaimSettingsModal"
import { BondModal } from "@ui/domains/Staking/Bond/BondModal"
import { NomPoolWithdrawModal } from "@ui/domains/Staking/NomPoolWithdraw/NomPoolWithdrawModal"
import { UnbondModal } from "@ui/domains/Staking/Unbond/UnbondModal"
import { SwapTokensModal } from "@ui/domains/Swap/components/SwapTokensModal"
import { MigrationProgress } from "@ui/domains/System/MigrationProgress"
import { ExplorerNetworkPickerModal } from "@ui/domains/ViewOnExplorer"
import { useLoginCheck } from "@ui/hooks/useLoginCheck"

import { LedgerPolkadotUpgradeAlertDrawer } from "./components/LedgerPolkadotUpgradeDrawer"
import { AddCustomErc20Token } from "./pages/AddCustomErc20Token"
import { AddEthereumNetwork } from "./pages/AddEthereumNetwork"
import { Connect } from "./pages/Connect"
import { Encrypt } from "./pages/Encrypt"
import { LearnMorePage } from "./pages/LearnMore/LearnMore"
import { LoginViewManager } from "./pages/Login"
import { ManageAccountsPage } from "./pages/ManageAccounts"
import { Metadata } from "./pages/Metadata"
import { Portfolio } from "./pages/Portfolio"
import { SendFundsPage } from "./pages/SendFunds"
import { EthereumSignRequest } from "./pages/Sign/ethereum"
import { SolanaSignRequest } from "./pages/Sign/solana"
import { SolanaSignInPage } from "./pages/Sign/solana/SignIn"
import { SubstrateSignRequest } from "./pages/Sign/substrate"
import { TryTalismanPage } from "./pages/TryTalisman"
import { TxHistoryPage } from "./pages/TxHistory"
import { WhatsNewPage } from "./pages/WhatsNew/WhatsNew"

const Popup = () => {
  const { isLoggedIn, isOnboarded, isMigrating } = useLoginCheck()

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

  if (isMigrating) return <MigrationProgress />

  return (
    <FadeIn className="h-full w-full">
      <Suspense fallback={<SuspenseTracker name="Routes" />}>
        <Routes>
          <Route path="portfolio/*" element={<Portfolio />} />
          <Route path={`${AUTH_PREFIX}/:id`} element={<Connect />} />
          <Route path={`${AUTH_SOL_SIGN_IN_PREFIX}/:id`} element={<SolanaSignInPage />} />
          <Route path={`${SIGNING_TYPES.ETH_SIGN}/:id`} element={<EthereumSignRequest />} />
          <Route path={`${SIGNING_TYPES.ETH_SEND}/:id`} element={<EthereumSignRequest />} />
          <Route path={`${SIGNING_TYPES.SUBSTRATE_SIGN}/:id`} element={<SubstrateSignRequest />} />
          <Route path={`${SIGNING_TYPES.SOL_SIGN}/:id`} element={<SolanaSignRequest />} />
          <Route path={`${METADATA_PREFIX}/:id`} element={<Metadata />} />
          <Route path={`${ENCRYPT_ENCRYPT_PREFIX}/:id`} element={<Encrypt />} />
          <Route path={`${ENCRYPT_DECRYPT_PREFIX}/:id`} element={<Encrypt />} />
          <Route path={`${ETH_NETWORK_ADD_PREFIX}/:id`} element={<AddEthereumNetwork />} />
          <Route path={`${WATCH_ASSET_PREFIX}/:id`} element={<AddCustomErc20Token />} />
          <Route path="try-talisman" element={<TryTalismanPage />} />
          <Route path="whats-new" element={<WhatsNewPage />} />
          <Route path="learn-more" element={<LearnMorePage />} />
          <Route path="manage-accounts" element={<ManageAccountsPage />} />
          <Route path="tx-history" element={<TxHistoryPage />} />
          <Route path="send/*" element={<SendFundsPage />} />
          <Route path="*" element={<Navigate to="/portfolio" replace />} />
        </Routes>
      </Suspense>
      <Suspense fallback={<SuspenseTracker name="Modals & alerts" />}>
        <AccountExportModal />
        <AccountExportPrivateKeyModal />
        <AccountRemoveModal />
        <AccountRenameModal />
        <BondModal />
        <BittensorBondModal />
        <BittensorClaimSettingsModal />
        <CopyAddressModal />
        <ExplorerNetworkPickerModal />
        <LedgerPolkadotUpgradeAlertDrawer />
        <NomPoolWithdrawModal />
        <RampsModal />
        <SwapTokensModal />
        <UnbondModal />
        <SeekBenefitsModal />
      </Suspense>
      {/* Render outside of suspense or it will never show in case of migration error */}
      <DatabaseErrorAlert container="popup" />
    </FadeIn>
  )
}

export default Popup
