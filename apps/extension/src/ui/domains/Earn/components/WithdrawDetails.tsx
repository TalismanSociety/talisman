import { FC } from "react"
import { useTranslation } from "react-i18next"

import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AddressDisplay } from "@ui/domains/SendFunds/AddressDisplay"

import { useWithdrawFundsContext } from "./WithdrawFundsProvider"

interface WithdrawDetailsProps {
  className?: string
}

export const WithdrawDetails: FC<WithdrawDetailsProps> = ({ className }) => {
  const { t } = useTranslation()
  const { account, token, tokenId, product, amount } = useWithdrawFundsContext()

  if (!account || !token || !product || !amount) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center text-gray-400">{t("Loading withdraw details...")}</div>
      </div>
    )
  }

  const protocolName = product?.metadata?.name || product?.providerId || t("Unknown")
  const protocolLogo = product?.metadata?.logoURI

  return (
    <div className={`flex flex-col gap-6 ${className || ""}`}>
      {/* Group 1: Amount and Account */}
      <div className="flex flex-col gap-3">
        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="text-body-secondary text-xs">{t("Amount")}</span>
          <div className="flex w-full items-center justify-end gap-4 text-right">
            <TokenLogo tokenId={token.id} className="text-sm" />
            <TokensAndFiat
              tokenId={tokenId}
              planck={amount}
              tokensClassName="text-white text-xs"
              noCountUp
              noFiat
            />
          </div>
        </div>

        {/* Account */}
        <div className="flex items-center justify-between">
          <span className="text-body-secondary text-xs">{t("Account")}</span>
          <AddressDisplay
            address={account}
            networkId={token.networkId}
            className="text-xs"
            hideBlockExplorer
          />
        </div>
      </div>

      {/* Divider */}
      <div className="bg-grey-800 h-0.5 w-full"></div>

      {/* Group 2: Protocol */}
      <div className="flex items-center justify-between">
        <span className="text-body-secondary text-xs">{t("Protocol")}</span>
        <div className="flex items-center gap-2 text-right">
          {protocolLogo ? (
            <img
              src={protocolLogo}
              alt={protocolName}
              className="h-6 w-6 flex-shrink-0 rounded-full"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          ) : null}
          <div className="max-w-80 truncate text-xs text-white">{protocolName}</div>
        </div>
      </div>
    </div>
  )
}
