import { AccountJson } from "@polkadot/extension-base/background/types"
import { LinkIcon, PolkadotVaultIcon, UsbIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type AccountTypeIconProps = {
  origin?: AccountJson["origin"] | null
  showLinked?: boolean
  className?: string
}

const getAccountTypeIcon = (origin: AccountJson["origin"] | null, showLinked: boolean) => {
  if (showLinked && ["SEED", "JSON"].includes(origin as string)) return LinkIcon
  if (origin === "HARDWARE") return UsbIcon
  if (origin === "QR") return PolkadotVaultIcon

  return null
}

export const AccountTypeIcon: FC<AccountTypeIconProps> = ({ origin, showLinked, className }) => {
  const Icon = getAccountTypeIcon(origin, !!showLinked)

  if (!Icon) return null

  return (
    <Tooltip>
      <TooltipTrigger>
        <Icon className={classNames("inline", className)} />
      </TooltipTrigger>
      <TooltipContent>
        <>{origin} Import</>
      </TooltipContent>
    </Tooltip>
  )
}
