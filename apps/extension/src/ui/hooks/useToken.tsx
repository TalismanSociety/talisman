import type { TokenId } from "@core/domains/tokens/types"
import { db } from "@core/libs/db"
import { api } from "@ui/api"
import { useLiveQuery } from "dexie-react-hooks"

import { useMessageSubscription } from "./useMessageSubscription"

const subscribe = () => api.tokens(() => {})
const useToken = (id?: TokenId) => {
  // make sure the store is hydrated
  useMessageSubscription("tokens", null, subscribe)

  return useLiveQuery(async () => (id !== undefined ? await db.tokens.get(id) : undefined), [id])
}

export default useToken
