import { FC } from "react"
import { useTranslation } from "react-i18next"

import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

import { AddressDisplay } from "../../SendFunds/AddressDisplay"
import { ApyRow } from "./DepositAmountForm/ApyRow"
import { ProtocolRow } from "./DepositAmountForm/ProtocolRow"
import { useDepositFunds } from "./useDepositFunds"

interface DepositDetailsProps {
  className?: string
}

export const DepositDetails: FC<DepositDetailsProps> = ({ className }) => {
  const { t } = useTranslation()
  const { account, token, product, deposit } = useDepositFunds()

  if (!account || !token || !product || !deposit) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center text-gray-400">{t("Loading deposit details...")}</div>
      </div>
    )
  }

  const formatRewardFrequency = (schedule: string) => {
    switch (schedule.toLowerCase()) {
      case "daily":
        return t("Daily")
      case "weekly":
        return t("Weekly")
      case "monthly":
        return t("Monthly")
      case "yearly":
        return t("Yearly")
      default:
        return schedule
    }
  }

  const formatWithdrawalTime = (cooldownPeriod?: { seconds: number }) => {
    if (!cooldownPeriod) return t("Instant")

    const days = Math.floor(cooldownPeriod.seconds / 86400)
    const hours = Math.floor((cooldownPeriod.seconds % 86400) / 3600)

    if (days > 0) {
      return t("{{days}} day(s)", { days })
    } else if (hours > 0) {
      return t("{{hours}} hour(s)", { hours })
    } else {
      return t("{{minutes}} minute(s)", { minutes: Math.floor(cooldownPeriod.seconds / 60) })
    }
  }

  const getCuratorInfo = () => {
    // This would need to be determined based on the product type
    // For now, we'll show the provider or a default
    return product?.providerId || t("Not available")
  }

  const getReceiveInfo = (): string => {
    return product?.outputToken?.symbol || t("Not available")
  }

  return (
    <div className={`flex flex-col gap-6 ${className || ""}`}>
      {/* Group 1: Amount and Account */}
      <div className="flex flex-col gap-3">
        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="text-body-secondary text-sm">{t("Amount")}</span>
          <div className="flex w-full items-center justify-end gap-8 text-right">
            <TokenLogo tokenId={token.id} className="text-md" />
            <TokensAndFiat
              tokenId={token.id}
              planck={deposit.planck}
              tokensClassName="text-white text-md"
              noCountUp
              noFiat
            />
          </div>
        </div>

        {/* Account */}
        <div className="flex items-center justify-between">
          <span className="text-body-secondary text-sm">{t("Account")}</span>
          <AddressDisplay
            address={account.address}
            networkId={token.networkId}
            className="text-sm"
            hideBlockExplorer
          />
        </div>
      </div>

      {/* Divider */}
      <div className="bg-grey-800 h-0.5 w-full"></div>

      {/* Group 2: APY, Reward Frequency, and Withdrawal Time */}
      <div className="flex flex-col gap-6">
        {/* APY */}
        <div className="!text-sm">
          <ApyRow />
        </div>

        {/* Reward Frequency */}
        <div className="flex items-center justify-between">
          <span className="text-body-secondary text-sm">{t("Reward Frequency")}</span>
          <span className="text-body text-sm">
            {formatRewardFrequency(product?.mechanics?.rewardSchedule || "")}
          </span>
        </div>

        {/* Withdrawal Time */}
        <div className="flex items-center justify-between">
          <span className="text-body-secondary text-sm">{t("Withdrawal Time")}</span>
          <span className="text-body text-sm">
            {formatWithdrawalTime(product?.mechanics?.cooldownPeriod)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="bg-grey-800 h-0.5 w-full"></div>

      {/* Group 3: Curator, Protocol, and Receive */}
      <div className="flex flex-col gap-6">
        {/* Curator */}
        <div className="flex items-center justify-between">
          <span className="text-body-secondary text-sm">{t("Curator")}</span>
          <span className="text-body text-sm">{getCuratorInfo()}</span>
        </div>

        <div className="!text-sm">
          <ProtocolRow />
        </div>

        {/* Receive - only show if outputToken exists */}
        {product?.outputToken && (
          <div className="flex items-center justify-between">
            <span className="text-body-secondary text-sm">{t("Receive")}</span>
            <span className="text-body text-sm">{getReceiveInfo()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
