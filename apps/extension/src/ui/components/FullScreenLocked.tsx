import { classNames } from "@talismn/util"
import { HandMonoLogo } from "@ui/theme/logos"
import type { ReactNode } from "react"

import { FadeIn } from "./FadeIn"

type Props = {
  className?: string
  title?: ReactNode
  subtitle?: ReactNode
}

export const FullScreenLocked = ({ className, title, subtitle }: Props) => (
  <FadeIn className="flex h-screen w-screen flex-col items-center justify-center">
    <section
      className={classNames(
        "flex select-none flex-col items-center text-body-secondary",
        className
      )}
    >
      <div className="relative">
        <HandMonoLogo className={classNames("mb-8 block text-[7.5rem] text-white")} />
      </div>
      {title && <h1 className="mb-2 font-bold text-grey-300 text-md">{title}</h1>}
      {subtitle && <h2 className="text-xs">{subtitle}</h2>}
    </section>
  </FadeIn>
)
