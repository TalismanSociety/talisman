import { api } from "@ui/api"
import { useCallback } from "react"
import { useMessageSubscription } from "./useMessageSubscription"

const DO_NOTHING = () => {}

export type DbEntityType = "chains" | "evmNetworks" | "tokens" | "balances"

// when this hook is called, backend keeps the associated db table in sync with the datasource (blockchain, subsquid, etc.)
export const useDbDataSubscription = (subscribeTo: DbEntityType) => {
  const subscribe = useCallback(() => {
    switch (subscribeTo) {
      case "chains":
        return api.chains(DO_NOTHING)
      case "evmNetworks":
        return api.ethereumNetworks(DO_NOTHING)
      case "tokens":
        return api.tokens(DO_NOTHING)
      case "balances":
        return api.balances(DO_NOTHING)
    }
  }, [subscribeTo])

  useMessageSubscription(subscribeTo, null, subscribe)
}
