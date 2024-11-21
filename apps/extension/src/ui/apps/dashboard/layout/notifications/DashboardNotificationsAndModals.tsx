import { Suspense, useEffect, useState } from "react"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { AccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { AccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { AccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { AccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { BuyTokensModal } from "@ui/domains/Asset/Buy/BuyTokensModal"
import { CopyAddressModal } from "@ui/domains/CopyAddress"
import { GetStartedModals } from "@ui/domains/Portfolio/GetStarted/GetStartedModals"
import { MigratePasswordModal } from "@ui/domains/Settings/MigratePassword/MigratePasswordModal"
import { NomPoolBondModal } from "@ui/domains/Staking/NomPoolBond/NomPoolBondModal"
import { NomPoolUnbondModal } from "@ui/domains/Staking/NomPoolUnbond/NomPoolUnbondModal"
import { NomPoolWithdrawModal } from "@ui/domains/Staking/NomPoolWithdraw/NomPoolWithdrawModal"
import { ExplorerNetworkPickerModal } from "@ui/domains/ViewOnExplorer"

import DashboardNotifications from "."
import { BackupWarningModal } from "./BackupWarningModal"
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
      <BackupWarningModal />
      <BuyTokensModal />
      <AccountRenameModal />
      <AccountExportModal />
      <AccountExportPrivateKeyModal />
      <AccountRemoveModal />
      <CopyAddressModal />
      <ExplorerNetworkPickerModal />
      <MigratePasswordModal />
      <OnboardingToast />
      <NomPoolBondModal />
      <NomPoolUnbondModal />
      <NomPoolWithdrawModal />
      <GetStartedModals />
    </Suspense>
  )
}
