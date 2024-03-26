import { BackButton } from "@talisman/components/BackButton"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { classNames } from "@talismn/util"
import { AnalyticsPage } from "@ui/api/analytics"
import { AccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { AccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { AccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { AccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { BuyTokensModal } from "@ui/domains/Asset/Buy/BuyTokensModal"
import { CopyAddressModal } from "@ui/domains/CopyAddress"
import { MigratePasswordModal } from "@ui/domains/Settings/MigratePassword/MigratePasswordModal"
import { ExplorerNetworkPickerModal } from "@ui/domains/ViewOnExplorer"
import { FC, Suspense, useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"

import DashboardNotifications from "./DashboardNotifications"
import { BackupWarningModal } from "./DashboardNotifications/BackupWarningModal"
import { OnboardingToast } from "./OnboardingToast"
import { Sidebar } from "./Sidebar"

type LayoutProps = {
  children?: React.ReactNode
  centered?: boolean
  large?: boolean
  withBack?: boolean
  backTo?: string
  className?: string
  analytics?: AnalyticsPage
}

const DashboardNotificationsAndModals = () => {
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
    <Suspense fallback={<SuspenseTracker name="Modals" />}>
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
    </Suspense>
  )
}

export const DashboardLayout: FC<LayoutProps> = ({
  centered,
  large,
  withBack,
  backTo,
  children,
  className,
  analytics,
}) => {
  //scrollToTop on location change
  const scrollableRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    scrollableRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <main className="flex h-dvh w-dvw">
      <Sidebar />
      <section
        ref={scrollableRef}
        className={classNames(
          "scrollable scrollable-800 flex-grow overflow-x-auto overflow-y-scroll p-10 sm:p-[5.2rem]"
        )}
      >
        <Suspense fallback={<SuspenseTracker name="DashboardLayout.main" />}>
          <div
            className={classNames(
              "relative w-full min-w-[66rem]",
              centered && "mx-auto",
              centered && (large ? "max-w-[120rem]" : "max-w-[66rem]"),
              className
            )}
          >
            {!!withBack && <BackButton analytics={analytics} className="mb-[3rem]" to={backTo} />}
            {children}
          </div>
          <DashboardNotificationsAndModals />
        </Suspense>
      </section>
    </main>
  )
}
