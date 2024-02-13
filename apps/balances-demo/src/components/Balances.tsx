import { useBalances } from "@talismn/balances-react"
import { classNames, formatDecimals } from "@talismn/util"
import { Fragment } from "react"

import { useExtensionAccounts } from "../hooks/useExtensionAccounts"

export const Balances = () => {
  const accounts = useExtensionAccounts()
  const balances = useBalances()

  return (
    <div className="grid grid-cols-[repeat(6,_auto)] items-center gap-x-4 gap-y-2">
      {balances?.filterNonZero("total").sorted.map((balance) => (
        <Fragment key={balance.id}>
          <img
            className="h-12 w-12 max-w-none justify-self-center"
            alt="token logo"
            src={balance.token?.logo}
          />

          <span>
            <span
              className={classNames("rounded-sm bg-[#1a1a1a] p-2 text-center font-bold")}
              style={{
                color: balance.chain?.themeColor ?? balance.evmNetwork?.themeColor ?? undefined,
              }}
            >
              {balance.chain?.themeColor ?? balance.evmNetwork?.themeColor}
            </span>
          </span>

          <span>{balance.status}</span>

          <span>
            <span
              className={classNames(
                "min-w-[6rem] overflow-hidden overflow-ellipsis whitespace-nowrap rounded-sm bg-[#1a1a1a] p-2 text-center font-bold"
              )}
              style={{
                color: balance.chain?.themeColor ?? balance.evmNetwork?.themeColor ?? undefined,
              }}
            >
              {balance.chain?.name || balance.evmNetwork?.name}
            </span>
          </span>

          <span className="flex flex-col whitespace-nowrap">
            <span className="whitespace-nowrap">
              {formatDecimals(balance.transferable.tokens)} {balance.token?.symbol}
            </span>
            <span className="text-xs opacity-60">
              {typeof balance.transferable.fiat("usd") === "number"
                ? new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: "usd",
                    currencyDisplay: "narrowSymbol",
                  }).format(balance.transferable.fiat("usd") || 0)
                : " -"}
            </span>
          </span>

          <span className="max-w-md overflow-hidden overflow-ellipsis whitespace-pre">
            {accounts?.find(({ address }) => address === balance.address)?.meta?.name ??
              balance.address}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

export const BalancesFallback = () => (
  <div className="grid animate-pulse grid-cols-[repeat(6,_auto)] items-center gap-x-4 gap-y-2">
    {[0, 1, 2, 3].map((i) => (
      <Fragment key={i}>
        <div className="bg-black-tertiary h-12 w-12 max-w-none justify-self-center rounded-full" />
        <div className="bg-black-tertiary h-[1em] w-36 rounded" />
        <div className="bg-black-tertiary h-[1em] w-36 rounded" />
        <div className="bg-black-tertiary h-[1em] w-36 rounded" />
        <div className="bg-black-tertiary h-[1em] w-36 rounded" />
        <div className="bg-black-tertiary h-[1em] w-36 rounded" />
      </Fragment>
    ))}
  </div>
)
