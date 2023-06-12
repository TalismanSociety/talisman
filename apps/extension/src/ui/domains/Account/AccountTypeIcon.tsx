import { AccountType } from "@core/domains/accounts/types"
import { EyeIcon, LinkIcon, PolkadotVaultIcon, UsbIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type AccountTypeIconProps = {
  origin?: AccountType | null
  showLinked?: boolean
  className?: string
}

export const AccountTypeIcon: FC<AccountTypeIconProps> = ({ origin, showLinked, className }) => {
  const { t } = useTranslation()

  const { Icon, tooltip } = useMemo(() => {
    if (!!showLinked && ["SEED", "JSON"].includes(origin as string))
      return { Icon: LinkIcon, tooltip: t("Imported account") }
    if (origin === "HARDWARE") return { Icon: UsbIcon, tooltip: t("Hardware wallet account") }
    if (origin === "QR") return { Icon: PolkadotVaultIcon, tooltip: t("Polkadot Vault account") }
    if (origin === "WATCHED") return { Icon: EyeIcon, tooltip: t("Watched only account") }

    return {}
  }, [origin, showLinked, t])

  if (!origin || !Icon) return null

  return (
    <Tooltip>
      <TooltipTrigger>
        <Icon className={classNames("inline shrink-0", className)} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
