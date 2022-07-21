import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@core/libs/db"
import { useSettings } from "@ui/hooks/useSettings"

const subscribe = () => api.tokens(() => {})
export const useTokens = () => {
  // make sure the store is hydrated
  useMessageSubscription("tokens", null, subscribe)

  const { useTestnets = false } = useSettings()
  return useLiveQuery(
    async () =>
      (await db.tokens.toArray()).filter((token) =>
        useTestnets ? true : token.isTestnet === false
      ),
    [useTestnets]
  )
}

export default useTokens
