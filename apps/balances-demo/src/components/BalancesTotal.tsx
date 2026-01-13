import { useBalances } from "@talismn/balances-react"
import { FiLoader } from "react-icons/fi"

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
        <div className="text-body-secondary text-md">Total</div>
        <div className="font-bold text-lg">{total}</div>
      </div>
      <div>
        <div className="text-body-secondary text-md">Available</div>
        <div className="font-bold text-lg">{available}</div>
      </div>
      <div>
        <div className="text-body-secondary text-md">Locked</div>
        <div className="font-bold text-lg">{locked}</div>
      </div>
    </div>
  )
}

export const BalancesTotalFallback = () => (
  <div className="flex gap-12">
    <div>
      <div className="flex items-center gap-2 text-body-secondary text-md">
        Total
        <FiLoader className="animate-spin-slow text-body-disabled" />
      </div>
      <div className="font-bold text-lg">$0.00</div>
    </div>
    <div>
      <div className="flex items-center gap-2 text-body-secondary text-md">
        Available
        <FiLoader className="animate-spin-slow text-body-disabled" />
      </div>
      <div className="font-bold text-lg">$0.00</div>
    </div>
    <div>
      <div className="flex items-center gap-2 text-body-secondary text-md">
        Locked
        <FiLoader className="animate-spin-slow text-body-disabled" />
      </div>
      <div className="font-bold text-lg">$0.00</div>
    </div>
  </div>
)
