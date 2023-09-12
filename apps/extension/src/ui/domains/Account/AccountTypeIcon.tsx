import { AccountType, AccountTypes } from "@core/domains/accounts/types"
import { DcentLogoIcon, EyeIcon, LinkIcon, PolkadotVaultIcon, UsbIcon } from "@talisman/theme/icons"
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
    if (!!showLinked && origin === AccountTypes.TALISMAN)
      return { Icon: LinkIcon, tooltip: t("Local account") }
    if (origin === AccountTypes.LEDGER) return { Icon: UsbIcon, tooltip: t("Ledger account") }
    if (origin === AccountTypes.QR)
      return { Icon: PolkadotVaultIcon, tooltip: t("Polkadot Vault account") }
    if (origin === AccountTypes.WATCHED) return { Icon: EyeIcon, tooltip: t("Watched account") }
    if (origin === AccountTypes.DCENT)
      return { Icon: DcentLogoIcon, tooltip: t("D'CENT Biometric Wallet account") }

    return {}
  }, [origin, showLinked, t])

  if (!origin || !Icon) return null

  // wrap icon with a span as tooltip trigger needs a ref to it's children
  return (
    <Tooltip>
      <TooltipTrigger asChild className="flex flex-col justify-center">
        <span>
          <Icon className={classNames(className)} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
