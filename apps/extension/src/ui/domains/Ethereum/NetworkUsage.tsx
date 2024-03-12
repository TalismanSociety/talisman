import { EthBaseFeeTrend } from "@extension/core"
import {
  NetworkUsageDecreasingIcon,
  NetworkUsageHighIcon,
  NetworkUsageIdleIcon,
  NetworkUsageIncreasingIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, SVGProps } from "react"
import { useTranslation } from "react-i18next"

const NetworkUsageBase = ({
  text,
  icon: Icon,
  className,
}: {
  text: string
  icon: FC<SVGProps<SVGSVGElement>>
  className?: string
}) => {
  return (
    <div className={classNames("flex items-center gap-4 text-sm", className)}>
      <div className="leading-none">{text}</div>
      <Icon className="block h-[1em] w-auto" />
    </div>
  )
}

type NetworkUsageProps = { baseFeeTrend?: EthBaseFeeTrend; className?: string }

export const NetworkUsage: FC<NetworkUsageProps> = ({ baseFeeTrend, className }) => {
  const { t } = useTranslation("request")
  switch (baseFeeTrend) {
    case "idle":
      return <NetworkUsageBase className={className} text={t("Idle")} icon={NetworkUsageIdleIcon} />
    case "increasing":
      return (
        <NetworkUsageBase
          className={className}
          text={t("Increasing")}
          icon={NetworkUsageIncreasingIcon}
        />
      )
    case "decreasing":
      return (
        <NetworkUsageBase
          className={className}
          text={t("Decreasing")}
          icon={NetworkUsageDecreasingIcon}
        />
      )
    case "toTheMoon":
      return (
        <NetworkUsageBase className={className} text={t("Very High")} icon={NetworkUsageHighIcon} />
      )
    default:
      return null
  }
}
