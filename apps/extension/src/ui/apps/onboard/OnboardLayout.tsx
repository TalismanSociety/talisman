import { BackButton } from "@talisman/components/BackButton"
import { FadeIn } from "@talisman/components/FadeIn"
import { classNames } from "@talismn/util"
import { AnalyticsPage } from "@ui/api/analytics"
import { FC, ReactNode, Suspense } from "react"

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
      "sm:pt-auto flex h-full w-full items-center justify-center pt-12",
      className
    )}
  >
    {!!withBack && (
      <BackButton
        className="bg-body hover:bg-body absolute left-4 top-4 z-20 bg-opacity-10 transition-colors ease-in hover:bg-opacity-20 sm:left-32 sm:top-32"
        analytics={analytics}
      />
    )}
    {/* Wrap in suspense to prevent bg full reset when reaching create account page (loads different translations domain) */}
    <Suspense>
      <FadeIn className="z-10 duration-500">{children}</FadeIn>
    </Suspense>
  </div>
)
