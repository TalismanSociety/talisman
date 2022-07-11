import type { ChainId } from "@core/domains/chains/types"
import { db } from "@core/libs/db"
import { api } from "@ui/api"
import { useLiveQuery } from "dexie-react-hooks"

import { useMessageSubscription } from "./useMessageSubscription"

const subscribe = () => api.chains(() => {})
const useChain = (id?: ChainId) => {
  // make sure the store is hydrated
  useMessageSubscription("chains", null, subscribe)

  return useLiveQuery(async () => (id !== undefined ? await db.chains.get(id) : undefined), [id])
}

export default useChain
