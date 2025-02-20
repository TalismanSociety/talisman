import { useBalances } from "@talismn/balances-react"
import { classNames, formatDecimals } from "@talismn/util"
import { Fragment } from "react"

import { useExtensionAccounts } from "../hooks/useExtensionAccounts"

export const Balances = () => {
  const accounts = useExtensionAccounts()
  const balances = useBalances()

  return (
    <div className="grid grid-cols-[repeat(7,_auto)] items-center gap-4">
      <>
        <div className="text-tiny justify-self-center font-bold">Logo</div>
        <div className="text-tiny font-bold">Colour</div>
        <div className="text-tiny justify-self-center font-bold">Status</div>
        <div className="text-tiny font-bold">Chain</div>
        <div className="text-tiny font-bold">Total</div>
        <div className="text-tiny font-bold">Available</div>
        <div className="text-tiny font-bold">Account</div>
      </>
      {balances?.sorted.map((balance) => (
        <Fragment key={balance.id}>
          <div
            className={classNames([
              "h-20 w-20 max-w-none justify-self-center bg-contain",
              !(
                /^https:\/\/raw.githubusercontent.com\/TalismanSociety\/chaindata\//i.test(
                  balance.token?.logo ?? "",
                ) && !/assets\/tokens\/coingecko/i.test(balance.token?.logo ?? "")
              ) && "rounded-full",
            ])}
            style={{ backgroundImage: `url(${balance.token?.logo})` }}
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
                // TODO: Get initializing status from pool, it's no longer available on individual balances
                // balance.status === "initializing" && "text-brand-pink",
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
                "overflow-hidden overflow-ellipsis whitespace-nowrap rounded-sm bg-[#1a1a1a] px-4 py-2 text-center font-bold",
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
          </span>

          <span className="flex flex-col whitespace-nowrap">
            <span className="whitespace-nowrap">
              {formatDecimals(balance.total.tokens)} {balance.token?.symbol}
            </span>
            <span className="text-xs opacity-60">
              {typeof balance.total.fiat("usd") === "number"
                ? new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: "usd",
                    currencyDisplay: "narrowSymbol",
                  }).format(balance.total.fiat("usd") || 0)
                : " -"}
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

          <button
            type="button"
            className={classNames([
              // button
              "max-w-md overflow-hidden overflow-ellipsis whitespace-pre",
              // overlay style
              "after:bg-body-black after:text-tiny relative after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded after:px-2 after:py-1 after:content-['copied_address']",
              // overlay transition
              "after:opacity-0 after:transition-opacity after:duration-1000",
              // activate overlay transition
              "active:after:opacity-100 active:after:duration-0",
            ])}
            onClick={() => {
              navigator.clipboard.writeText(balance.address)
            }}
          >
            {accounts?.find(({ address }) => address === balance.address)?.meta?.name ??
              `${balance.address.slice(0, 4)}…${balance.address.slice(-4)}`}
          </button>
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
