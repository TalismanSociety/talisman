import { FC } from "react"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { useBittensorValidator } from "@ui/state/bittensor"

export const BittensorValidatorName: FC<{
  hotkey: string | null | undefined
  prefix?: string
  className?: string
}> = ({ hotkey, prefix, className }) => {
  const { status, data: validator } = useBittensorValidator(hotkey)

  if (!hotkey) return null
  if (!validator && status === "loading") return null

  return (
    <span className={className}>
      {prefix ?? ""}
      {validator?.name ?? shortenAddress(hotkey)}
    </span>
  )
}
