import { EthBaseFeeTrend } from "@core/domains/signing/types"
import {
  NetworkUsageDecreasing,
  NetworkUsageHigh,
  NetworkUsageIdle,
  NetworkUsageIncreasing,
} from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC, SVGProps } from "react"

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
    <div className={classNames("flex items-start gap-4 text-sm", className)}>
      <div className="leading-none">{text}</div>
      <Icon className="block h-[1em] w-auto" />
    </div>
  )
}

type NetworkUsageProps = { baseFeeTrend?: EthBaseFeeTrend; className?: string }

export const NetworkUsage: FC<NetworkUsageProps> = ({ baseFeeTrend, className }) => {
  switch (baseFeeTrend) {
    case "idle":
      return <NetworkUsageBase className={className} text="Idle" icon={NetworkUsageIdle} />
    case "increasing":
      return (
        <NetworkUsageBase className={className} text="Increasing" icon={NetworkUsageIncreasing} />
      )
    case "decreasing":
      return (
        <NetworkUsageBase className={className} text="Decreasing" icon={NetworkUsageDecreasing} />
      )
    case "toTheMoon":
      return <NetworkUsageBase className={className} text="Very High" icon={NetworkUsageHigh} />
    default:
      return null
  }
}
