import { db } from "@core/libs/dexieDb"
import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@core/types"
import { api } from "@ui/api"
import { useLiveQuery } from "dexie-react-hooks"

import { useMessageSubscription } from "./useMessageSubscription"

const subscribe = () => api.ethereumNetworks(() => {})
export const useEvmNetwork = (id?: EvmNetworkId): EvmNetwork | CustomEvmNetwork | undefined => {
  // make sure the store is hydrated
  useMessageSubscription("ethereumNetworks", null, subscribe)

  return useLiveQuery(
    async () => (id !== undefined ? await db.evmNetworks.get(id) : undefined),
    [id]
  )
}
