import { AccountJsonAny } from "@core/domains/accounts/types"
import { EyeIcon, LinkIcon, PolkadotVaultIcon, UsbIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type AccountTypeIconProps = {
  origin?: AccountJsonAny["origin"] | null
  showLinked?: boolean
  className?: string
}

const getAccountTypeIcon = (origin: AccountJsonAny["origin"] | null, showLinked: boolean) => {
  if (showLinked && ["SEED", "JSON"].includes(origin as string))
    return { Icon: LinkIcon, tooltip: `Imported account` }
  if (origin === "HARDWARE") return { Icon: UsbIcon, tooltip: `Hardware wallet account` }
  if (origin === "QR") return { Icon: PolkadotVaultIcon, tooltip: `Polkadot Vault account` }
  if (origin === "WATCHED") return { Icon: EyeIcon, tooltip: "Watched only account" }

  return {}
}

export const AccountTypeIcon: FC<AccountTypeIconProps> = ({ origin, showLinked, className }) => {
  const { Icon, tooltip } = getAccountTypeIcon(origin, !!showLinked)

  if (!Icon) return null

  return (
    <Tooltip>
      <TooltipTrigger>
        <Icon className={classNames("inline", className)} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
