import { CheckCircleIcon, XCircleIcon, ZapIcon, ZapOffIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"

type IconType = "stake" | "unstake" | "confirm" | "cancel"

const getIcon = (type: IconType) => {
  switch (type) {
    case "stake":
      return ZapIcon
    case "unstake":
      return ZapOffIcon
    case "confirm":
      return CheckCircleIcon
    case "cancel":
      return XCircleIcon
  }
}

const getClassName = (type: IconType) => {
  switch (type) {
    case "stake":
    case "unstake":
      return "text-primary-500"
    case "confirm":
      return "text-alert-success"
    case "cancel":
      return "text-brand-orange"
  }
}

export const SignViewStakingHeader: FC<{ icon: IconType }> = ({ icon }) => {
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
