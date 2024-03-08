import { AccountType } from "@extension/core"
import {
  DcentIcon,
  EyeIcon,
  LinkIcon,
  PolkadotVaultIcon,
  SignetIcon,
  UsbIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type AccountTypeIconProps = {
  origin?: AccountType | null
  showLinked?: boolean
  className?: string
  signetUrl?: string
}

export const AccountTypeIcon: FC<AccountTypeIconProps> = ({
  origin,
  showLinked,
  className,
  signetUrl,
}) => {
  const { t } = useTranslation()

  const { Icon, tooltip } = useMemo(() => {
    if (!!showLinked && origin === AccountType.Talisman)
      return { Icon: LinkIcon, tooltip: t("Local account") }
    if (
      origin === AccountType.Ledger ||
      // @ts-expect-error incomplete migration, remove once migration is completed
      origin === "HARDWARE"
    )
      return { Icon: UsbIcon, tooltip: t("Ledger account") }
    if (origin === AccountType.Qr)
      return { Icon: PolkadotVaultIcon, tooltip: t("Polkadot Vault account") }
    if (origin === AccountType.Watched) return { Icon: EyeIcon, tooltip: t("Watched account") }
    if (origin === AccountType.Dcent)
      return { Icon: DcentIcon, tooltip: t("D'CENT Biometric Wallet account") }
    if (origin === AccountType.Signet)
      return {
        Icon: SignetIcon,
        tooltip: t(`Signet Vault${signetUrl !== undefined ? `: ${signetUrl}` : ""}`),
      }

    return {}
  }, [origin, showLinked, signetUrl, t])

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
