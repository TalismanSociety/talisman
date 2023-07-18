import { BackButton } from "@talisman/components/BackButton"
import { classNames } from "@talismn/util"
import { AnalyticsPage } from "@ui/api/analytics"
import { AccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { AccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { AccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { AccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { BuyTokensModal } from "@ui/domains/Asset/Buy/BuyTokensModal"
import { CopyAddressModal } from "@ui/domains/CopyAddress"
import { FC, Suspense, lazy, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"

import { OnboardingToast } from "./OnboardingToast"
import { SideBar } from "./SideBar"

const DashboardNotifications = lazy(() => import("./DashboardNotifications"))

type LayoutProps = {
  children?: React.ReactNode
  centered?: boolean
  large?: boolean
  withBack?: boolean
  backTo?: string
  className?: string
  analytics?: AnalyticsPage
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
    <main className={classNames("flex h-screen w-screen", className)}>
      <SideBar />
      <section
        ref={scrollableRef}
        className={classNames(
          "scrollable scrollable-800 flex-grow overflow-hidden overflow-y-scroll p-[5.2rem]",
          centered && "flex items-start justify-center"
        )}
      >
        <div
          className={classNames(
            "relative w-full",
            centered && (large ? "max-w-[120rem]" : "max-w-[66rem]")
          )}
        >
          {!!withBack && <BackButton analytics={analytics} className="mb-[3rem]" to={backTo} />}
          {children}
        </div>
        <Suspense fallback={null}>
          <DashboardNotifications />
        </Suspense>
      </section>
      <BuyTokensModal />
      <AccountRenameModal />
      <AccountExportModal />
      <AccountExportPrivateKeyModal />
      <AccountRemoveModal />
      <CopyAddressModal />
      <OnboardingToast />
    </main>
  )
}
