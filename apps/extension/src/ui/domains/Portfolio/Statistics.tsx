import { Token } from "@core/domains/tokens/types"
import { LockIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import BigNumber from "bignumber.js"
import { ReactNode } from "react"

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
}

const TokensAndFiat = ({
  tokenAmount,
  fiat,
  token,
}: {
  tokenAmount?: BigNumber
  fiat: number | null
  token?: Token
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
      {fiat === null ? "-" : <Fiat amount={fiat} currency="usd" isBalance />}
    </div>
  </div>
)
const FiatOnly = ({ fiat }: { fiat: number | null }) => (
  <div className="textbase text-white">
    {fiat === null ? "-" : <Fiat amount={fiat} currency="usd" isBalance />}
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
}: StatisticsProps) => {
  return (
    <text
      className={classNames(
        "bg-black-secondary flex h-[10rem] w-[23.6rem] flex-col gap-4 rounded p-8 ",
        className
      )}
    >
      <div className="text-body-secondary flex items-center gap-2 text-sm">
        {locked && <LockIcon />}
        {title}
      </div>
      {showTokens ? (
        <TokensAndFiat tokenAmount={tokens} fiat={fiat} token={token} />
      ) : (
        <FiatOnly fiat={fiat} />
      )}
    </text>
  )
}
