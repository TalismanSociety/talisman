import { ENCRYPT_DECRYPT_PREFIX, ENCRYPT_ENCRYPT_PREFIX } from "@core/domains/encrypt/types"
import { ETH_NETWORK_ADD_PREFIX, WATCH_ASSET_PREFIX } from "@core/domains/ethereum/types"
import { METADATA_PREFIX } from "@core/domains/metadata/types"
import { SIGNING_TYPES } from "@core/domains/signing/types"
import { AUTH_PREFIX, AUTH_SOL_SIGN_IN_PREFIX } from "@core/domains/sitesAuthorised/types"
import { api } from "@ui/api"
import { FadeIn } from "@ui/components/FadeIn"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { AccountCopyXpubModal } from "@ui/domains/Account/AccountCopyXpubModal"
import { AccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { AccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { AccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { AccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { AccountSignMessageModal } from "@ui/domains/Account/AccountSignMessageModal"
import { DeleteFolderModal } from "@ui/domains/Account/DeleteFolderModal"
import { RenameFolderModal } from "@ui/domains/Account/RenameFolderModal"
import { AddProxyModal } from "@ui/domains/AccountProxies/AddProxy/AddProxyModal"
import { ManageProxyModal } from "@ui/domains/AccountProxies/ManageProxy/ManageProxyModal"
import { CopyAddressModal } from "@ui/domains/CopyAddress"
import { EarnDepositModal } from "@ui/domains/Earn/components/EarnDepositModal"
import { EarnSystemActionModals } from "@ui/domains/Earn/systems/EarnSystemActionModals"
import { YieldxyzEnterPositionModal } from "@ui/domains/Earn/yieldxyz/enter/YieldxyzEnterPositionModal"
import { YieldxyzExitPositionModal } from "@ui/domains/Earn/yieldxyz/exit/YieldxyzExitPositionModal"
import { YieldxyzManagePositionModal } from "@ui/domains/Earn/yieldxyz/manage/YieldxyzManagePositionModal"
import { SeekBenefitsModal } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsModal"
import { RampsModal } from "@ui/domains/Ramps/RampsModal"
import { DatabaseErrorAlert } from "@ui/domains/Settings/DatabaseErrorAlert"
import { BittensorBondModal } from "@ui/domains/Staking/Bittensor/BittensorBondModal"
import { BittensorChangeLockHotkeyModal } from "@ui/domains/Staking/Bittensor/BittensorChangeLockHotkeyModal"
import { BittensorChangeLockTypeModal } from "@ui/domains/Staking/Bittensor/BittensorChangeLockTypeModal"
import { BittensorChangeValidatorModal } from "@ui/domains/Staking/Bittensor/BittensorChangeValidatorModal"
import { BittensorConvictionLockModal } from "@ui/domains/Staking/Bittensor/BittensorConvictionLockModal"
import { BittensorSettingsModal } from "@ui/domains/Staking/Bittensor/BittensorSettingsModal"
import { BondModal } from "@ui/domains/Staking/Bond/BondModal"
import { NomPoolWithdrawModal } from "@ui/domains/Staking/NomPoolWithdraw/NomPoolWithdrawModal"
import { UnbondModal } from "@ui/domains/Staking/Unbond/UnbondModal"
import { SwapModal } from "@ui/domains/Swap/components/SwapModal"
import { MigrationProgress } from "@ui/domains/System/MigrationProgress"
import { ExplorerNetworkPickerModal } from "@ui/domains/ViewOnExplorer"
import { useLoginCheck } from "@ui/hooks/useLoginCheck"
import { Suspense, useEffect } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { LedgerPolkadotUpgradeAlertDrawer } from "./components/LedgerPolkadotUpgradeDrawer"
import { AddCustomErc20Token } from "./pages/AddCustomErc20Token"
import { AddEthereumNetwork } from "./pages/AddEthereumNetwork"
import { Connect } from "./pages/Connect"
import { PopupEarnRoutes } from "./pages/Earn"
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
          <Route path="earn/*" element={<PopupEarnRoutes />} />
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
          <Route path="learn-more" element={<LearnMorePage />} />
          <Route path="manage-accounts" element={<ManageAccountsPage />} />
          <Route path="tx-history" element={<TxHistoryPage />} />
          <Route path="send/*" element={<SendFundsPage />} />
          <Route path="*" element={<Navigate to="/portfolio" replace />} />
        </Routes>
      </Suspense>
      <Suspense fallback={<SuspenseTracker name="Modals & alerts" />}>
        <AccountCopyXpubModal />
        <AccountSignMessageModal />
        <AccountExportModal />
        <AccountExportPrivateKeyModal />
        <AccountRemoveModal />
        <AccountRenameModal />
        <RenameFolderModal />
        <DeleteFolderModal />
        <BondModal />
        <BittensorBondModal />
        <BittensorConvictionLockModal />
        <BittensorChangeLockTypeModal />
        <BittensorChangeLockHotkeyModal />
        <BittensorChangeValidatorModal />
        <BittensorSettingsModal />
        <CopyAddressModal />
        <ExplorerNetworkPickerModal />
        <LedgerPolkadotUpgradeAlertDrawer />
        <NomPoolWithdrawModal />
        <RampsModal />
        <SwapModal />
        <UnbondModal />
        <SeekBenefitsModal />
        <EarnDepositModal />
        <EarnSystemActionModals />
        <YieldxyzEnterPositionModal />
        <YieldxyzExitPositionModal />
        <YieldxyzManagePositionModal />
        <AddProxyModal />
        <ManageProxyModal />
      </Suspense>
      {/* Render outside of suspense or it will never show in case of migration error */}
      <DatabaseErrorAlert container="popup" />
    </FadeIn>
  )
}

export default Popup
