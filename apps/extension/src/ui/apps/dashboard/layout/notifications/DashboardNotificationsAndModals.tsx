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
import { GetStartedModals } from "@ui/domains/Portfolio/GetStarted/GetStartedModals"
import { RampsModal } from "@ui/domains/Ramps/RampsModal"
import { MigratePasswordModal } from "@ui/domains/Settings/MigratePassword/MigratePasswordModal"
import { BittensorBondModal } from "@ui/domains/Staking/Bittensor/BittensorBondModal"
import { BittensorChangeLockHotkeyModal } from "@ui/domains/Staking/Bittensor/BittensorChangeLockHotkeyModal"
import { BittensorChangeLockTypeModal } from "@ui/domains/Staking/Bittensor/BittensorChangeLockTypeModal"
import { BittensorChangeValidatorModal } from "@ui/domains/Staking/Bittensor/BittensorChangeValidatorModal"
import { BittensorClaimModal } from "@ui/domains/Staking/Bittensor/BittensorClaimModal"
import { BittensorConvictionLockModal } from "@ui/domains/Staking/Bittensor/BittensorConvictionLockModal"
import { BittensorSettingsModal } from "@ui/domains/Staking/Bittensor/BittensorSettingsModal"
import { BondModal } from "@ui/domains/Staking/Bond/BondModal"
import { NomPoolWithdrawModal } from "@ui/domains/Staking/NomPoolWithdraw/NomPoolWithdrawModal"
import { UnbondModal } from "@ui/domains/Staking/Unbond/UnbondModal"
import { SwapModal } from "@ui/domains/Swap/components/SwapModal"
import { ExplorerNetworkPickerModal } from "@ui/domains/ViewOnExplorer"
import { Suspense, useEffect, useState } from "react"

import DashboardNotifications from "."
import { OnboardingToast } from "./OnboardingToast"

export const DashboardNotificationsAndModals = () => {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // delay the display of modals to prevent slowing down the initial render
    const timeout = setTimeout(() => {
      setShouldRender(true)
    }, 100)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  if (!shouldRender) return null

  return (
    <Suspense fallback={<SuspenseTracker name="DashboardNotificationsAndModals" />}>
      {/* this actually needs renders in place at the bottom of the page */}
      <DashboardNotifications />
      {/* below components can be rendered from anywhere */}
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
      <BittensorClaimModal />
      <CopyAddressModal />
      <ExplorerNetworkPickerModal />
      <GetStartedModals />
      <MigratePasswordModal />
      <NomPoolWithdrawModal />
      <OnboardingToast />
      <RampsModal />
      <SwapModal />
      <UnbondModal />
      <EarnDepositModal />
      <EarnSystemActionModals />
      <YieldxyzEnterPositionModal />
      <YieldxyzManagePositionModal />
      <YieldxyzExitPositionModal />
      <AddProxyModal />
      <ManageProxyModal />
    </Suspense>
  )
}
