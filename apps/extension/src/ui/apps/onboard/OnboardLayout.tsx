import { BackButton } from "@talisman/components/BackButton"
import { FadeIn } from "@talisman/components/FadeIn"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { classNames } from "@talismn/util"
import type { AnalyticsPage } from "@ui/api/analytics"
import { type FC, type ReactNode, Suspense } from "react"

type LayoutProps = {
  withBack?: boolean
  className?: string
  children?: ReactNode
  analytics?: AnalyticsPage
}

export const OnboardLayout: FC<LayoutProps> = ({
  analytics,
  withBack = false,
  children,
  className,
}) => (
  <div
    className={classNames(
      "flex h-full w-full items-center justify-center pt-12 sm:pt-auto",
      className
    )}
  >
    {!!withBack && (
      <BackButton
        className="absolute top-4 left-4 z-20 bg-opacity-50 transition-colors ease-in hover:bg-opacity-70 sm:top-32 sm:left-32"
        analytics={analytics}
      />
    )}
    {/* Wrap in suspense to prevent bg full reset when reaching create account page (loads different translations domain) */}
    <Suspense fallback={<SuspenseTracker name="OnboardLayout.Content" />}>
      <FadeIn className="z-10 duration-500">{children}</FadeIn>
    </Suspense>
  </div>
)
