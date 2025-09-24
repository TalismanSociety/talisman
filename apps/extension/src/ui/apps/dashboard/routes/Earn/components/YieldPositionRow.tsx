import { ChevronDownIcon, ChevronRightIcon } from "@talismn/icons"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { YieldPositionBalance } from "@ui/domains/Earn/services/yieldApi"

interface YieldPositionRowProps {
  position: YieldPositionBalance
  yieldId: string
}

export const YieldPositionRow: FC<YieldPositionRowProps> = ({ position, yieldId }) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  // Extract protocol name from yieldId (e.g., "ethereum-usdt-fusdt-0x5c20b550819128074fd538edf79791733ccedd18-4626-vault" -> "FUSDT Vault")
  const protocolName = useMemo(() => {
    const parts = yieldId.split("-")
    if (parts.length >= 3) {
      const protocol = parts[2].toUpperCase()
      const type =
        parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1)
      return `${protocol} ${type}`
    }
    return yieldId
  }, [yieldId])

  const amountUsd = parseFloat(position.amountUsd) || 0

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  return (
    <div className="text-body-secondary bg-grey-850 mb-4 rounded text-left text-base">
      {/* Main Row - Clickable */}
      <button
        type="button"
        onClick={handleToggleExpand}
        className="hover:bg-grey-800 flex h-[6.6rem] w-full cursor-pointer items-center px-8 transition-colors"
      >
        {/* Token Info */}
        <div className="flex w-[35%] items-center gap-4">
          <div className="bg-grey-700 flex h-16 w-16 items-center justify-center rounded-full">
            {position.token.logoURI ? (
              <img
                src={position.token.logoURI}
                alt={position.token.symbol}
                className="h-10 w-10 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                  target.nextElementSibling?.classList.remove("hidden")
                }}
              />
            ) : null}
            <div
              className={`text-body text-sm font-bold ${position.token.logoURI ? "hidden" : ""}`}
            >
              {position.token.symbol}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="text-body text-base font-bold">{position.token.symbol}</div>
            <div className="text-body-secondary text-sm">{protocolName}</div>
            <div className="text-body-secondary text-xs">{position.token.network}</div>
          </div>
        </div>

        {/* Status */}
        <div className="flex w-[25%] flex-col items-center">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${position.isEarning ? "bg-green-500" : "bg-yellow-500"}`}
            ></div>
            <span className="text-sm">{position.isEarning ? t("Earning") : t("Not Earning")}</span>
          </div>
          <div className="text-body-secondary mt-1 text-xs">{position.type}</div>
        </div>

        {/* Balance */}
        <div className="flex w-[30%] flex-col items-end">
          <div className="text-body text-base">
            <Tokens
              amount={position.amountRaw}
              symbol={position.token.symbol}
              decimals={position.token.decimals}
            />
          </div>
          <div className="text-body-secondary text-sm">
            <Fiat amount={amountUsd} />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex w-[10%] justify-end">
          {isExpanded ? (
            <ChevronDownIcon className="text-body-secondary h-4 w-4" />
          ) : (
            <ChevronRightIcon className="text-body-secondary h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-grey-700 border-t px-8 py-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <div className="text-body-secondary mb-1 text-xs">{t("Yield ID")}</div>
                <div className="text-body break-all font-mono text-sm">{yieldId}</div>
              </div>
              <div>
                <div className="text-body-secondary mb-1 text-xs">{t("Token Address")}</div>
                <div className="text-body font-mono text-sm">{position.token.address}</div>
              </div>
              <div>
                <div className="text-body-secondary mb-1 text-xs">{t("Token Name")}</div>
                <div className="text-body text-sm">{position.token.name}</div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <div className="text-body-secondary mb-1 text-xs">{t("Raw Amount")}</div>
                <div className="text-body text-sm">{position.amountRaw}</div>
              </div>
              <div>
                <div className="text-body-secondary mb-1 text-xs">{t("Decimals")}</div>
                <div className="text-body text-sm">{position.token.decimals}</div>
              </div>
              <div>
                <div className="text-body-secondary mb-1 text-xs">{t("CoinGecko ID")}</div>
                <div className="text-body text-sm">{position.token.coinGeckoId}</div>
              </div>
            </div>
          </div>

          {/* Pending Actions */}
          {position.pendingActions && position.pendingActions.length > 0 && (
            <div className="mt-6">
              <div className="text-body-secondary mb-2 text-xs">{t("Pending Actions")}</div>
              <div className="text-body text-sm">
                {position.pendingActions.length} {t("pending action(s)")}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
