import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@core/libs/db"
import { useSettings } from "@ui/hooks/useSettings"

const subscribe = () => api.chains(() => {})
export const useChains = () => {
  // make sure the store is hydrated
  useMessageSubscription("chains", null, subscribe)

  const { useTestnets = false } = useSettings()
  return useLiveQuery(
    async () =>
      (await db.chains.toArray()).filter((chain) =>
        useTestnets ? true : chain.isTestnet === false
      ),
    [useTestnets]
  )
}

export default useChains
