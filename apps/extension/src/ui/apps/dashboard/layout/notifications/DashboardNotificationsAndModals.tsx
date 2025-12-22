import { Suspense, useEffect, useState } from "react"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { AccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { AccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { AccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { AccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { CopyAddressModal } from "@ui/domains/CopyAddress"
import { GetStartedModals } from "@ui/domains/Portfolio/GetStarted/GetStartedModals"
import { SeekBenefitsModal } from "@ui/domains/Portfolio/SeekBenefits/SeekBenefitsModal"
import { RampsModal } from "@ui/domains/Ramps/RampsModal"
import { MigratePasswordModal } from "@ui/domains/Settings/MigratePassword/MigratePasswordModal"
import { BittensorBondModal } from "@ui/domains/Staking/Bittensor/BittensorBondModal"
import { BittensorClaimSettingsModal } from "@ui/domains/Staking/Bittensor/BittensorClaimSettingsModal"
import { BondModal } from "@ui/domains/Staking/Bond/BondModal"
import { NomPoolWithdrawModal } from "@ui/domains/Staking/NomPoolWithdraw/NomPoolWithdrawModal"
import { UnbondModal } from "@ui/domains/Staking/Unbond/UnbondModal"
import { SwapTokensModal } from "@ui/domains/Swap/components/SwapTokensModal"
import { ExplorerNetworkPickerModal } from "@ui/domains/ViewOnExplorer"

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
      <AccountExportModal />
      <AccountExportPrivateKeyModal />
      <AccountRemoveModal />
      <AccountRenameModal />
      <BondModal />
      <BittensorBondModal />
      <BittensorClaimSettingsModal />
      <CopyAddressModal />
      <ExplorerNetworkPickerModal />
      <GetStartedModals />
      <MigratePasswordModal />
      <NomPoolWithdrawModal />
      <OnboardingToast />
      <RampsModal />
      <SwapTokensModal />
      <UnbondModal />
      <SeekBenefitsModal />
    </Suspense>
  )
}
