import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { HandMonoLogo } from "@ui/theme/logos"
import { type ReactNode, Suspense } from "react"

import { PopupContent, PopupLayout } from "../../Layout/PopupLayout"
import { LoginScreenBackground } from "../Login"

export const QuickUnlockOfferBackdrop = ({ children }: { children?: ReactNode }) => (
  <PopupLayout>
    <Suspense fallback={<SuspenseTracker name="Background" />}>
      <LoginScreenBackground />
    </Suspense>
    <PopupContent className="z-10 select-none pt-32 text-center">
      <div className="mt-[60px]">
        <HandMonoLogo className="inline-block text-[64px]" />
      </div>
    </PopupContent>
    {children}
  </PopupLayout>
)
