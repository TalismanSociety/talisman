import { classNames } from "@talismn/util"
import { ReactNode } from "react"

import { HandMonoLogo, HandMonoSilhouetteLogo } from "@talisman/theme/logos"
import { api } from "@ui/api"

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
        "text-body-secondary flex flex-col items-center",
        "group cursor-pointer select-none",
        className
      )}
      role="button"
      tabIndex={0}
      onClick={() => api.promptLogin()}
      onKeyDown={(e) => ["Enter", " "].includes(e.key) && api.promptLogin()}
    >
      <div className="relative">
        <HandMonoSilhouetteLogo
          className={classNames(
            "mb-8 block text-[12rem] text-white",
            "opacity-100 transition-opacity duration-100 ease-out",
            "group-focus-within:opacity-0 group-focus-within:ease-in group-hover:opacity-0 group-hover:ease-in group-focus:opacity-0 group-focus:ease-in",
            "group-active:text-brand-orange group-active:opacity-0"
          )}
        />
        <HandMonoLogo
          className={classNames(
            "absolute left-0 top-0 mb-8 block text-[12rem] text-white",
            "opacity-0 transition-opacity duration-100 ease-in",
            "group-focus-within:opacity-100 group-focus-within:ease-out group-hover:opacity-100 group-hover:ease-out group-focus:opacity-100 group-focus:ease-out",
            "group-active:text-brand-orange group-active:opacity-100"
          )}
        />
      </div>
      {title && (
        <h1 className="text-md text-grey-300 group-active:text-brand-orange mb-2 font-bold">
          {title}
        </h1>
      )}
      {subtitle && <h2 className="group-active:text-brand-orange text-xs">{subtitle}</h2>}
    </section>
  </FadeIn>
)
