import { useSetBalancesAddresses } from "@talismn/balances-react"
import { Suspense, useMemo, useState } from "react"

import { Balances, BalancesFallback } from "./components/Balances"
import { BalancesTotal, BalancesTotalFallback } from "./components/BalancesTotal"
import { useExtensionAccounts } from "./hooks/useExtensionAccounts"
import { useExtensionSyncCustomChaindata } from "./hooks/useExtensionSyncCustomChaindata"

export function App(): JSX.Element {
  useExtensionSyncCustomChaindata()

  const accounts = useExtensionAccounts()
  const addresses = useMemo(() => (accounts ?? []).map((account) => account.address), [accounts])
  useSetBalancesAddresses(addresses)

  const [active, setActive] = useState(true)
  const toggleActive = () => setActive((a) => !a)

  return (
    <div className="m-5 flex flex-col gap-5">
      <h1 className="text-lg">Balances Demo</h1>
      <button onClick={toggleActive}>Toggle Active ({active ? "active" : "inactive"})</button>
      <Suspense fallback={<BalancesTotalFallback />}>
        <BalancesTotal />
      </Suspense>

      {/* Display balances per balance (so, per token per account) */}
      {active && (
        <Suspense fallback={<BalancesFallback />}>
          <Balances />
        </Suspense>
      )}
    </div>
  )
}
