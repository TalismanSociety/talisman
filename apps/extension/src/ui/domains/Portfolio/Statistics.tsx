import { Token } from "@talismn/chaindata-provider"
import { LockIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import BigNumber from "bignumber.js"
import { ReactNode } from "react"

import { useToggleCurrency } from "@ui/hooks/useToggleCurrency"
import { useSelectedCurrency } from "@ui/state"

import { currencyConfig } from "../Asset/currencyConfig"
import { Fiat } from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"

type StatisticsProps = {
  title: ReactNode
  tokens?: BigNumber
  fiat: number | null
  className?: string
  token?: Token
  locked?: boolean
  showTokens?: boolean
  showCurrencyToggle?: boolean
  align: "left" | "right"
}

const TokensAndFiat = ({
  tokenAmount,
  fiat,
  token,
  currencyDisplay,
  className,
}: {
  tokenAmount?: BigNumber
  fiat: number | null
  token?: Token
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"]
  className?: string
}) => (
  <div className={classNames("flex flex-col gap-2 whitespace-nowrap", className)}>
    <div className="textbase text-white">
      <Tokens
        amount={tokenAmount ?? "0"}
        isBalance
        decimals={token?.decimals}
        symbol={token?.symbol}
      />
    </div>
    <div className="text-body-secondary text-sm">
      {fiat === null ? "-" : <Fiat amount={fiat} isBalance currencyDisplay={currencyDisplay} />}
    </div>
  </div>
)

const FiatOnly = ({
  fiat,
  currencyDisplay,
}: {
  fiat: number | null
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"]
}) => (
  <div className="textbase text-white">
    {fiat === null ? "-" : <Fiat amount={fiat} isBalance currencyDisplay={currencyDisplay} />}
  </div>
)

export const Statistics = ({
  title,
  tokens,
  fiat,
  className,
  token,
  locked,
  showTokens,
  showCurrencyToggle,
  align,
}: StatisticsProps) => {
  const currency = useSelectedCurrency()
  const toggleCurrency = useToggleCurrency()

  return (
    <div
      className={classNames(
        "bg-black-secondary flex h-[10rem] w-[23.6rem] flex-col gap-4 rounded p-8",
        align === "right" ? "items-end" : "items-start",
        className
      )}
    >
      <div className="text-body-secondary flex items-center gap-2 text-sm">
        {locked && <LockIcon />}
        {title}
      </div>
      <div className="flex items-center gap-2">
        {showCurrencyToggle && (
          <button
            className={classNames(
              "border-grey-750 bg-grey-800 text-body-secondary hover:bg-grey-700 pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border text-center text-sm transition-colors duration-100 ease-out",
              currencyConfig[currency]?.symbol?.length === 2 && "text-[1rem]",
              currencyConfig[currency]?.symbol?.length > 2 && "text-[0.8rem]"
            )}
            onClick={(event) => {
              event.stopPropagation()
              toggleCurrency()
            }}
          >
            {currencyConfig[currency]?.symbol}
          </button>
        )}
        {showTokens ? (
          <TokensAndFiat
            tokenAmount={tokens}
            fiat={fiat}
            token={token}
            currencyDisplay={showCurrencyToggle ? "code" : undefined}
            className={align === "right" ? "items-end" : "items-start"}
          />
        ) : (
          <FiatOnly fiat={fiat} currencyDisplay={showCurrencyToggle ? "code" : undefined} />
        )}
      </div>
    </div>
  )
}
