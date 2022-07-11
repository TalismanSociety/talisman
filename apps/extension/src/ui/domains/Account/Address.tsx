import { WithTooltip } from "@talisman/components/Tooltip"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { FC, useMemo } from "react"

type AddressProps = {
  address: string
  startCharCount?: number
  endCharCount?: number
  as?: "span" | "div"
  className?: string
  noTooltip?: boolean
}

export const Address: FC<AddressProps> = ({
  address,
  startCharCount = 4,
  endCharCount = 4,
  as: Component = "span",
  className,
  noTooltip,
}) => {
  const formatted = useMemo(
    () => shortenAddress(address, startCharCount, endCharCount),
    [address, startCharCount, endCharCount]
  )

  //if we're not in a popup, no need to wrap
  const noWrap = useMemo(() => !document.getElementById("main"), [])

  if (!formatted) return null

  return noTooltip ? (
    <Component className={className}>{formatted}</Component>
  ) : (
    <WithTooltip as={Component} className={className} tooltip={address} noWrap={noWrap}>
      {formatted}
    </WithTooltip>
  )
}
