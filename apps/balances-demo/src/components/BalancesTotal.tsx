import { useBalances } from "@talismn/balances-react"
import { LoaderIcon } from "@talismn/icons"

export const BalancesTotal = () => {
  const balances = useBalances()

  const currencyParams: Intl.NumberFormatOptions = {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
  }

  const total = (balances.sum.fiat("usd").total ?? 0).toLocaleString(undefined, currencyParams)
  const available = (balances.sum.fiat("usd").transferable ?? 0).toLocaleString(
    undefined,
    currencyParams
  )

  const locked = (balances.sum.fiat("usd").unavailable ?? 0).toLocaleString(
    undefined,
    currencyParams
  )

  return (
    <div className="flex gap-12">
      <div>
        <div className="text-md text-body-secondary">Total</div>
        <div className="text-lg font-bold">{total}</div>
      </div>
      <div>
        <div className="text-md text-body-secondary">Available</div>
        <div className="text-lg font-bold">{available}</div>
      </div>
      <div>
        <div className="text-md text-body-secondary">Locked</div>
        <div className="text-lg font-bold">{locked}</div>
      </div>
    </div>
  )
}

export const BalancesTotalFallback = () => (
  <div className="flex gap-12">
    <div>
      <div className="text-md text-body-secondary flex items-center gap-2">
        Total
        <LoaderIcon className="animate-spin-slow text-body-disabled" />
      </div>
      <div className="text-lg font-bold">$0.00</div>
    </div>
    <div>
      <div className="text-md text-body-secondary flex items-center gap-2">
        Available
        <LoaderIcon className="animate-spin-slow text-body-disabled" />
      </div>
      <div className="text-lg font-bold">$0.00</div>
    </div>
    <div>
      <div className="text-md text-body-secondary flex items-center gap-2">
        Locked
        <LoaderIcon className="animate-spin-slow text-body-disabled" />
      </div>
      <div className="text-lg font-bold">$0.00</div>
    </div>
  </div>
)
