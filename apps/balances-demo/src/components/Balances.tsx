import { useBalances } from "@talismn/balances-react"
import { classNames, formatDecimals } from "@talismn/util"
import { Fragment } from "react"

import { useExtensionAccounts } from "../hooks/useExtensionAccounts"

export const Balances = () => {
  const accounts = useExtensionAccounts()
  const balances = useBalances()

  return (
    <div className="grid grid-cols-[repeat(6,_auto)] items-center gap-4">
      {balances?.filterNonZero("total").sorted.map((balance) => (
        <Fragment key={balance.id}>
          <img
            className="h-20 w-20 max-w-none justify-self-center"
            alt="token logo"
            src={balance.token?.logo}
          />

          <span>
            <span
              className={classNames("rounded-sm bg-[#1a1a1a] px-4 py-2 text-center font-bold")}
              style={{
                color: balance.chain?.themeColor ?? balance.evmNetwork?.themeColor ?? undefined,
              }}
            >
              {balance.chain?.themeColor ?? balance.evmNetwork?.themeColor}
            </span>
          </span>

          <span className="flex min-w-48 flex-shrink-0 items-center justify-center">
            <span
              className={classNames([
                "rounded-sm bg-[#1a1a1a] px-4 py-2 text-center font-bold",
                balance.status === "initializing" && "text-brand-pink",
                balance.status === "cache" && "text-orange",
                balance.status === "stale" && "text-brand-orange",
              ])}
            >
              {balance.status}
            </span>
          </span>

          <span className="flex items-center justify-start gap-2">
            <span
              className={classNames(
                "overflow-hidden overflow-ellipsis whitespace-nowrap rounded-sm bg-[#1a1a1a] px-4 py-2 text-center font-bold"
              )}
              style={{
                color: balance.chain?.themeColor ?? balance.evmNetwork?.themeColor ?? undefined,
              }}
            >
              <span>{balance.chain?.name || balance.evmNetwork?.name}</span>
            </span>
            {balance.chain?.isTestnet || balance.evmNetwork?.isTestnet ? (
              <span className="text-tiny bg-alert-warn/10 text-alert-warn rounded-sm px-3 py-1 font-light">
                Testnet
              </span>
            ) : null}
            {balance.subSource !== undefined ? (
              <span className="text-tiny bg-alert-warn/10 text-alert-warn rounded-sm px-3 py-1 font-light">
                {balance.subSource}
              </span>
            ) : null}
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
  <div className="grid animate-pulse grid-cols-[repeat(6,_auto)] items-center gap-4">
    {[0, 1, 2, 3, 4].map((i) => (
      <Fragment key={i}>
        <div className="bg-black-tertiary h-20 w-20 max-w-none justify-self-center rounded-full" />
        <div className="bg-black-tertiary rounded px-4 py-2">
          <div className="invisible">SkeletonSkeleton</div>
        </div>
        <div className="flex min-w-48 flex-shrink-0 items-center justify-center">
          <div className="bg-black-tertiary rounded px-4 py-2">
            <div className="invisible">Skeleton</div>
          </div>
        </div>
        <div className="bg-black-tertiary rounded px-4 py-2">
          <div className="invisible">SkeletonSkeletonSkeleton</div>
        </div>

        <div className="bg-black-tertiary rounded px-4 py-2">
          <div className="invisible">SkeletonSkeleton</div>
        </div>

        <div className="bg-black-tertiary rounded px-4 py-2">
          <div className="invisible">SkeletonSkeleton</div>
        </div>
      </Fragment>
    ))}
  </div>
)
