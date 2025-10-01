import { ChevronDownIcon, ChevronRightIcon } from "@talismn/icons"
import { YieldPositionBalance } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Fiat } from "@ui/domains/Asset/Fiat"

interface DefiAssetRowProps {
  tokenSymbol: string
  tokenData: {
    token: YieldPositionBalance["token"]
    positions: Array<{ balance: YieldPositionBalance; yieldId: string }>
    totalAmount: string
    totalAmountUsd: string
    holdingsCount: number
  }
}

export const DefiAssetRow: FC<DefiAssetRowProps> = ({ tokenSymbol: _tokenSymbol, tokenData }) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  const totalAmountUsd = parseFloat(tokenData.totalAmountUsd) || 0

  // Calculate total amount across all positions (using human-readable amounts)
  const totalAmount = useMemo(() => {
    const sum = tokenData.positions.reduce((sum, pos) => {
      return sum + parseFloat(pos.balance.amount)
    }, 0)
    return sum.toFixed(2)
  }, [tokenData.positions])

  // Extract protocol names from yieldIds
  const getProtocolName = useCallback((yieldId: string) => {
    const parts = yieldId.split("-")
    if (parts.length >= 3) {
      const protocol = parts[2].charAt(0).toUpperCase() + parts[2].slice(1)
      return protocol
    }
    return yieldId
  }, [])

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  return (
    <div className="text-body-secondary bg-grey-850 mb-4 rounded text-left text-base">
      {/* Main Asset Row - Clickable */}
      <button
        type="button"
        onClick={handleToggleExpand}
        className="hover:bg-grey-800 flex h-[6.6rem] w-full cursor-pointer items-center px-8 transition-colors"
      >
        {/* Token Info */}
        <div className="flex w-[60%] items-center gap-4">
          <div className="bg-grey-700 flex h-16 w-16 items-center justify-center rounded-full">
            {tokenData.token.logoURI ? (
              <img
                src={tokenData.token.logoURI}
                alt={tokenData.token.symbol}
                className="h-10 w-10 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                  target.nextElementSibling?.classList.remove("hidden")
                }}
              />
            ) : null}
            <div
              className={`text-body text-sm font-bold ${tokenData.token.logoURI ? "hidden" : ""}`}
            >
              {tokenData.token.symbol}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="text-body text-base font-bold">{tokenData.token.symbol}</div>
            <div className="text-body-secondary text-sm">
              {tokenData.holdingsCount}{" "}
              {tokenData.holdingsCount === 1 ? t("position") : t("positions")}
            </div>
          </div>
        </div>

        {/* Total Balance */}
        <div className="flex w-[30%] flex-col items-end">
          <div className="text-body text-base">
            {totalAmount} {tokenData.token.symbol}
          </div>
          <div className="text-body-secondary text-sm">
            <Fiat amount={totalAmountUsd} />
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

      {/* Expanded Protocol Positions */}
      {isExpanded && (
        <div className="border-grey-700 border-t">
          {tokenData.positions.map((position, index) => {
            const protocolName = getProtocolName(position.yieldId)
            const positionAmountUsd = parseFloat(position.balance.amountUsd) || 0

            return (
              <div
                key={`${position.yieldId}-${index}`}
                className="hover:bg-grey-800 border-grey-750 flex items-center border-b px-8 py-4 transition-colors last:border-b-0"
              >
                {/* Protocol Info */}
                <div className="flex w-[60%] items-center gap-4 pl-8">
                  <div className="bg-grey-600 flex h-12 w-12 items-center justify-center rounded-full">
                    <div className="text-body text-xs font-bold">
                      {protocolName.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-body text-sm font-medium">{protocolName}</div>
                    <div className="text-body-secondary text-xs">
                      {position.balance.isEarning ? t("Earning") : t("Not Earning")}
                    </div>
                  </div>
                </div>

                {/* Position Balance */}
                <div className="flex w-[30%] flex-col items-end">
                  <div className="text-body text-sm">
                    {parseFloat(position.balance.amount).toFixed(2)} {position.balance.token.symbol}
                  </div>
                  <div className="text-body-secondary text-xs">
                    <Fiat amount={positionAmountUsd} />
                  </div>
                </div>

                {/* Empty space for alignment */}
                <div className="w-[10%]"></div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
