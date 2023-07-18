import SPINNING from "@talisman/theme/images/hand_open_spin_animated_dark.gif"
import STATIC from "@talisman/theme/images/hand_open_static_dark.gif"
import ERROR from "@talisman/theme/images/hand_thumbs_down_animated_dark.gif"
import SUCCESS from "@talisman/theme/images/hand_thumbs_up_animated_dark.gif"
import { classNames } from "@talismn/util"
import { ReactNode } from "react"

const ICONS = {
  STATIC,
  SPINNING,
  SUCCESS,
  ERROR,
} as const

interface IProps {
  status?: keyof typeof ICONS
  title?: string
  subtitle?: ReactNode
  className?: string
}

export const StatusIcon = ({ status = "STATIC", title, subtitle, className }: IProps) => (
  <section className={classNames("text-body-secondary text-center", className)}>
    <img
      src={ICONS[status]}
      alt={`icon todo: ${status.toLowerCase()}`}
      className="mx-auto my-0 block w-[22rem]"
    />
    {title && <h1 className="text-md text-grey-300 mt-[-1rem] font-bold">{title}</h1>}
    {subtitle && <h2 className="mt-4 text-xs">{subtitle}</h2>}
  </section>
)
