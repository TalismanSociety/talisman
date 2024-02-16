import { useSetBalancesAddresses } from "@talismn/balances-react"
import { Suspense, useMemo, useState } from "react"

import { Balances, BalancesFallback } from "./components/Balances"
import { BalancesTotal, BalancesTotalFallback } from "./components/BalancesTotal"
import { Button } from "./components/Button"
import { useExtensionAccounts } from "./hooks/useExtensionAccounts"
import { useExtensionSyncCustomChaindata } from "./hooks/useExtensionSyncCustomChaindata"

export function App(): JSX.Element {
  useExtensionSyncCustomChaindata()

  const accounts = useExtensionAccounts()
  const addresses = useMemo(() => (accounts ?? []).map((account) => account.address), [accounts])
  useSetBalancesAddresses(addresses)

  const [forceSkeletons, setForceSkeletons] = useState(false)
  const [tableActive, setTableActive] = useState(true)
  const [headerActive, setHeaderActive] = useState(true)

  return (
    <div className="m-5 flex flex-col items-center gap-5">
      <h1 className="text-lg">Balances Demo</h1>
      <div className="flex justify-center gap-5">
        <Button onClick={() => setHeaderActive((a) => !a)}>Toggle Header</Button>
        <Button onClick={() => setTableActive((a) => !a)}>Toggle Table</Button>
        <Button
          onClick={() => {
            setHeaderActive((a) => !a)
            setTableActive((a) => !a)
          }}
        >
          Toggle Both
        </Button>
        <Button
          className={forceSkeletons ? "text-primary" : undefined}
          onClick={() => {
            setForceSkeletons((a) => !a)
          }}
        >
          Force Skeletons
        </Button>
      </div>
      {headerActive && forceSkeletons && <BalancesTotalFallback />}
      {headerActive && !forceSkeletons && (
        <Suspense fallback={<BalancesTotalFallback />}>
          <BalancesTotal />
        </Suspense>
      )}
      {tableActive && forceSkeletons && <BalancesFallback />}
      {tableActive && !forceSkeletons && (
        <Suspense fallback={<BalancesFallback />}>
          <Balances />
        </Suspense>
      )}
    </div>
  )
}
