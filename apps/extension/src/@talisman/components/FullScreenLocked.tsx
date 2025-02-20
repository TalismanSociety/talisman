import { classNames } from "@talismn/util"
import { ReactNode } from "react"

import { HandMonoLogo } from "@talisman/theme/logos"

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
        "text-body-secondary flex select-none flex-col items-center",
        className,
      )}
    >
      <div className="relative">
        <HandMonoLogo className={classNames("mb-8 block text-[12rem] text-white")} />
      </div>
      {title && <h1 className="text-md text-grey-300 mb-2 font-bold">{title}</h1>}
      {subtitle && <h2 className="text-xs">{subtitle}</h2>}
    </section>
  </FadeIn>
)
