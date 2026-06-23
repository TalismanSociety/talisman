import { useMemo } from "react"

import { useEarnSystemProviders } from "../systems/registry"
import { combineEarnStatuses } from "../systems/status"
import type { EarnProvider } from "../types"

export const useEarnProviders = () => {
  const results = useEarnSystemProviders()

  const data = useMemo<EarnProvider[]>(
    () =>
      results.flatMap((result) => result.providers).sort((a, b) => a.name.localeCompare(b.name)),
    [results]
  )
  const status = combineEarnStatuses(results.map((result) => result.status))

  return useMemo(() => ({ status, data }), [data, status])
}
