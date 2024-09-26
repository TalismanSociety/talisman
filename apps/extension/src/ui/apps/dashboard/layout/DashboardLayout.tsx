import { classNames } from "@talismn/util"
import { FC, Suspense, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"

import { BackButton } from "@talisman/components/BackButton"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { AnalyticsPage } from "@ui/api/analytics"

import { DashboardNotificationsAndModals } from "./DashboardNotificationsAndModals"
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
