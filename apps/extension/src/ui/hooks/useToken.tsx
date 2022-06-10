import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import type { TokenId } from "@core/types"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@core/libs/dexieDb"

const subscribe = () => api.tokens(() => {})
const useToken = (id?: TokenId) => {
  // make sure the store is hydrated
  useMessageSubscription("tokens", null, subscribe)

  return useLiveQuery(async () => (id !== undefined ? await db.tokens.get(id) : undefined), [id])
}

export default useToken
