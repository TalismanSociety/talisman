import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@core/libs/dexieDb"
import { useSettings } from "@ui/hooks/useSettings"

const subscribe = () => api.ethereumNetworks(() => {})
export const useEvmNetworks = () => {
  // make sure the store is hydrated
  useMessageSubscription("ethereumNetworks", null, subscribe)

  const { useTestnets = false } = useSettings()
  return useLiveQuery(
    async () =>
      (await db.evmNetworks.toArray()).filter((evmNetwork) =>
        useTestnets ? true : evmNetwork.isTestnet === false
      ),
    [useTestnets]
  )
}
