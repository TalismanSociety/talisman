import {
  CheckCircleIcon,
  RefreshCwIcon,
  VoteIcon,
  XCircleIcon,
  ZapIcon,
  ZapOffIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"

export type SignIconType = "vote" | "stake" | "unstake" | "ok" | "nok" | "transfer"

const getIcon = (type: SignIconType) => {
  switch (type) {
    case "stake":
      return ZapIcon
    case "unstake":
      return ZapOffIcon
    case "ok":
      return CheckCircleIcon
    case "nok":
      return XCircleIcon
    case "vote":
      return VoteIcon
    case "transfer":
      return RefreshCwIcon
  }
}

const getClassName = (type: SignIconType) => {
  switch (type) {
    case "nok":
      return "text-brand-orange"
    default:
      return "text-primary-500"
  }
}

export const SignViewIconHeader: FC<{ icon: SignIconType }> = ({ icon }) => {
  const { Icon, className } = useMemo(
    () => ({
      Icon: getIcon(icon),
      className: getClassName(icon),
    }),
    [icon]
  )

  return (
    <div>
      <div className="bg-grey-800 mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full">
        <Icon className={classNames("text-[28px]", className)} />
      </div>
    </div>
  )
}
