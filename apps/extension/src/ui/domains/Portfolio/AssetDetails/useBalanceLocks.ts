import { LockedBalance } from "@core/domains/balances/types"
import { ChainId } from "@core/domains/chains/types"
import { Address } from "@core/types/base"
import * as Sentry from "@sentry/browser"
import { api } from "@ui/api"
import flatMap from "lodash/flatMap"
import { useMemo, useState } from "react"
import { useDebounce } from "react-use"

type BalanceLocksOptions = {
  chainId?: ChainId
  addresses?: Address[]
}

export const useBalanceLocks = ({ chainId, addresses = [] }: BalanceLocksOptions) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  // need params serialized other wise it will trigger on each balance update
  const [balanceLocks, setBalanceLocks] = useState<Record<Address, LockedBalance[]>>({})
  const [updateKey, setUpdateKey] = useState<string>()

  // on init, balances load so fast that updateKey check isn't set fast enough
  // debounce to prevent querying multiple times the same data
  useDebounce(
    () => {
      if (!chainId || typeof chainId !== "string" || !addresses.length) {
        setBalanceLocks({})
        setError(undefined)
        return
      }

      // refresh only if necessary
      const key = `${chainId}|${addresses.join("-")}`
      if (key === updateKey) return
      setUpdateKey(key)

      setError(undefined)
      setIsLoading(true)

      api
        .getBalanceLocks({ chainId, addresses })
        .then(setBalanceLocks)
        .catch((err) => {
          setError("Failed to load balance locks")
          Sentry.captureException(err, { tags: { chainId } })
        })
        .finally(() => {
          setIsLoading(false)
        })
    },
    50,
    [chainId, addresses, updateKey]
  )

  const consolidatedLocks = useMemo(() => {
    const allChainLocks = flatMap(Object.values(balanceLocks))
    // regroup by type
    return allChainLocks.reduce<LockedBalance[]>((acc, lock) => {
      const existing = acc.find((l) => l.type === lock.type)
      if (existing) existing.amount = (BigInt(existing.amount) + BigInt(lock.amount)).toString()
      else acc.push(lock)
      return acc
    }, [])
  }, [balanceLocks])

  return { balanceLocks, consolidatedLocks, isLoading, error }
}
