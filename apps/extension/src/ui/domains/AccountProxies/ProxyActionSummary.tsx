import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

type ProxyActionSummaryProps = {
  accountAddress: string
  networkId: string
  networkName: string | undefined
  networkPrefix: number | undefined
  delegateAddress: string
  proxyType: string
  delay: number
}

export const ProxyActionSummary: FC<ProxyActionSummaryProps> = ({
  accountAddress,
  networkId,
  networkName,
  networkPrefix,
  delegateAddress,
  proxyType,
  delay,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6">
      <div className="flex items-center justify-between gap-8">
        <span className="whitespace-nowrap text-body-secondary text-sm">{t("Account")}</span>
        <AccountDisplay
          address={accountAddress}
          ss58Format={networkPrefix}
          className="shrink-0 overflow-hidden text-body text-sm [&_svg]:size-10"
        />
      </div>
      <div className="flex items-center justify-between gap-8">
        <span className="text-body-secondary text-sm">{t("Network")}</span>
        <div className="flex items-center gap-4 text-body text-sm">
          <NetworkLogo networkId={networkId} className="size-10 shrink-0" />
          <span className="truncate">{networkName ?? networkId}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-8">
        <span className="whitespace-nowrap text-body-secondary text-sm">{t("Delegate")}</span>
        <AccountDisplay
          address={delegateAddress}
          ss58Format={networkPrefix}
          className="overflow-hidden text-body text-sm [&_svg]:size-10"
        />
      </div>
      <div className="flex h-10 items-center justify-between gap-8">
        <span className="text-body-secondary text-sm">{t("Proxy type")}</span>
        <span className="truncate text-body text-sm">{proxyType}</span>
      </div>
      <div className="flex h-10 items-center justify-between gap-8">
        <span className="text-body-secondary text-sm">{t("Delay")}</span>
        <span className="text-body text-sm">{`${delay} ${t("blocks")}`}</span>
      </div>
    </div>
  )
}
