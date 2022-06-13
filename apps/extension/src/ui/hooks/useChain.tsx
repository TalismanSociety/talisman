import { api } from "@ui/api"
import { useMessageSubscription } from "./useMessageSubscription"
import type { ChainId } from "@core/types"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@core/libs/db"

const subscribe = () => api.chains(() => {})
const useChain = (id?: ChainId) => {
  // make sure the store is hydrated
  useMessageSubscription("chains", null, subscribe)

  return useLiveQuery(async () => (id !== undefined ? await db.chains.get(id) : undefined), [id])
}

export default useChain
