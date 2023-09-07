import { Token } from "@core/domains/tokens/types"
import { LockIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useToggleCurrency } from "@ui/hooks/useCurrency"
import useSelectedCurrency from "@ui/hooks/useSelectedCurrency"
import BigNumber from "bignumber.js"
import { ReactNode } from "react"

import currencyConfig from "../Asset/currencyConfig"
import Fiat from "../Asset/Fiat"
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
}

const TokensAndFiat = ({
  tokenAmount,
  fiat,
  token,
  hideSymbol,
}: {
  tokenAmount?: BigNumber
  fiat: number | null
  token?: Token
  hideSymbol?: boolean
}) => (
  <div className="flex flex-col gap-2 whitespace-nowrap">
    <div className="textbase text-white">
      <Tokens
        amount={tokenAmount ?? "0"}
        isBalance
        decimals={token?.decimals}
        symbol={token?.symbol}
      />
    </div>
    <div className="text-body-secondary text-sm">
      {fiat === null ? "-" : <Fiat amount={fiat} isBalance hideSymbol={hideSymbol} />}
    </div>
  </div>
)

const FiatOnly = ({ fiat, hideSymbol }: { fiat: number | null; hideSymbol?: boolean }) => (
  <div className="textbase text-white">
    {fiat === null ? "-" : <Fiat amount={fiat} isBalance hideSymbol={hideSymbol} />}
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
}: StatisticsProps) => {
  const currency = useSelectedCurrency()
  const toggleCurrency = useToggleCurrency()

  return (
    <div
      className={classNames(
        "bg-black-secondary flex h-[10rem] w-[23.6rem] flex-col gap-4 rounded p-8 ",
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
            className="border-grey-750 bg-grey-800 text-body-secondary hover:bg-grey-700 pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border text-center transition-colors duration-100 ease-out"
            onClick={(event) => {
              event.stopPropagation()
              toggleCurrency()
            }}
          >
            {currencyConfig[currency]?.unicodeCharacter}
          </button>
        )}
        {showTokens ? (
          <TokensAndFiat
            tokenAmount={tokens}
            fiat={fiat}
            token={token}
            hideSymbol={showCurrencyToggle}
          />
        ) : (
          <FiatOnly fiat={fiat} hideSymbol={showCurrencyToggle} />
        )}
      </div>
    </div>
  )
}
