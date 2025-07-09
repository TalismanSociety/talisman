import { Balance } from "@talismn/balances"
import { classNames } from "@talismn/util"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { BalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useSelectedCurrency } from "@ui/state"

import { StaleBalancesIcon } from "../../StaleBalancesIcon"
import { usePortfolioNavigation } from "../../usePortfolioNavigation"
import { PortfolioAccount } from "../PortfolioAccount"
import { useUniswapV2BalancePair } from "../useUniswapV2BalancePair"

type TokenBalancesUniswapV2RowProps = {
  balance: Balance
  isLastBalance?: boolean
  status: BalancesStatus
}

export const TokenBalancesUniswapV2Row = ({
  balance,
  isLastBalance,
  status,
}: TokenBalancesUniswapV2RowProps) => {
  const { selectedAccount } = usePortfolioNavigation()
  const selectedCurrency = useSelectedCurrency()
  const balancePair = useUniswapV2BalancePair(balance)
  if (!balancePair) return null

  const token = balance.token
  if (token?.type !== "evm-uniswapv2") return null
  if (!balance.networkId) return null

  return (
    <div
      className={classNames(
        "bg-black-secondary flex w-full flex-col justify-center gap-8 px-7 py-6",
        isLastBalance && "rounded-b-sm",
      )}
    >
      {/* only show address when we're viewing balances for all accounts */}
      {!selectedAccount && (
        <div className="flex items-end justify-between gap-4 text-xs">
          <PortfolioAccount address={balance.address} />
        </div>
      )}
      {balancePair.map(({ tokenId, symbol, holdingBalance }) => (
        <div key={tokenId} className="flex w-full items-center gap-6">
          <div className="text-xl">
            <TokenLogo tokenId={tokenId} />
          </div>
          <div className="grow font-bold text-white">{symbol}</div>
          <div
            className={classNames(
              "flex flex-col flex-nowrap justify-center gap-2 whitespace-nowrap text-right",
              status.status === "fetching" && "animate-pulse transition-opacity",
            )}
          >
            <div className={"font-bold text-white"}>
              <Tokens amount={holdingBalance.tokens} symbol={symbol} isBalance />
              {status.status === "stale" ? (
                <>
                  {" "}
                  <StaleBalancesIcon
                    className="inline align-baseline"
                    staleChains={status.staleChains}
                  />
                </>
              ) : null}
            </div>
            <div className="text-xs">
              {holdingBalance.fiat(selectedCurrency) === null ? (
                "-"
              ) : (
                <Fiat amount={holdingBalance.fiat(selectedCurrency)} isBalance />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
