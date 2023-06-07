import { LinkIcon, PolkadotVaultIcon, UsbIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type AccountTypeIconProps = {
  origin?: string | null
  showLinked?: boolean
  className?: string
}

const getAccountTypeIcon = (origin: string | null | undefined, showLinked: boolean) => {
  if (showLinked && ["SEED", "JSON"].includes(origin as string)) return LinkIcon
  if (origin === "HARDWARE") return UsbIcon
  if (origin === "QR") return PolkadotVaultIcon

  return null
}

export const AccountTypeIcon: FC<AccountTypeIconProps> = ({ origin, showLinked, className }) => {
  const { t } = useTranslation()
  const Icon = getAccountTypeIcon(origin, !!showLinked)

  if (!origin || !Icon) return null

  return (
    <Tooltip>
      <TooltipTrigger>
        <Icon className={classNames("inline", className)} />
      </TooltipTrigger>
      <TooltipContent>
        <Trans t={t}>{origin} Import</Trans>
      </TooltipContent>
    </Tooltip>
  )
}
