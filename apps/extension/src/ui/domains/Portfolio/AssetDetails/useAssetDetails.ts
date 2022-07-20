import { Balances, LockedBalance } from "@core/domains/balances/types"
import { api } from "@ui/api"
import { flatMap } from "lodash"
import { useEffect, useMemo, useState } from "react"

import { usePortfolio } from "../context"
import { useSelectedAccount } from "../SelectedAccountContext"
import { useDisplayBalances } from "../useDisplayBalances"

export const useAssetDetails = (balances: Balances) => {
  const balancesToDisplay = useDisplayBalances(balances)
  const { account, accounts } = useSelectedAccount()
  const { hydrate, isLoading } = usePortfolio()

  const chainIds = useMemo(
    () =>
      [...new Set(balancesToDisplay.sorted.map((b) => b.chainId ?? b.evmNetworkId))].filter(
        (cid) => cid !== undefined
      ),
    [balancesToDisplay.sorted]
  )

  const addresses = useMemo(() => {
    return account ? [account.address] : accounts.map((a) => a.address)
  }, [account, accounts])

  const balancesByChain = useMemo(() => {
    return chainIds.reduce(
      (acc, chainId) => ({
        ...acc,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        [chainId!]: new Balances(
          balancesToDisplay.sorted.filter(
            (b) => b.chainId === chainId || b.evmNetworkId === chainId
          ),
          hydrate
        ),
      }),
      {} as Record<string | number, Balances>
    )
  }, [balancesToDisplay.sorted, chainIds, hydrate])

  const [lockedByChain, setLockedByChain] = useState<Record<string, LockedBalance[]>>({})
  const [updateKey, setUpdateKey] = useState<string>()

  // query locks
  useEffect(() => {
    if (!chainIds.length || !addresses.length) {
      setLockedByChain({})
      return
    }

    const substrateChainIds = chainIds.filter((cid) => typeof cid === "string") as string[]

    // only update if there is no pending update
    // note : balances update so frequently that sometimes it isn't sufficient to prevent identic calls
    const callKey = `${addresses.join("-")}|${substrateChainIds.join}`
    if (callKey === updateKey) return
    setUpdateKey(callKey)

    Promise.all(
      substrateChainIds.map((chainId) => api.getBalanceLocks({ chainId, addresses }))
    ).then((chainLocks) => {
      const locks: Record<string, LockedBalance[]> = {}
      substrateChainIds.forEach((chainId, index) => {
        const allChainLocks = flatMap(Object.values(chainLocks[index]))
        // regroup by type
        const consolidated = allChainLocks.reduce<LockedBalance[]>((acc, lock) => {
          const existing = acc.find((l) => l.type === lock.type)
          if (existing) existing.amount = (BigInt(existing.amount) + BigInt(lock.amount)).toString()
          else acc.push(lock)
          return acc
        }, [])
        locks[chainId] = consolidated
      })
      setLockedByChain(locks)
    })
  }, [addresses, chainIds, updateKey])

  return { balancesByChain, isLoading, lockedByChain }
}
