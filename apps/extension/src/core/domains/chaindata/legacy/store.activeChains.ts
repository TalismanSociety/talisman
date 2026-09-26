import { StorageProvider } from "../../../libs/Store"

type ActiveChains = Record<string, boolean>

/**
 * Stores the active state of each substrate network, if and only if the user has overriden it.
 * Active state is stored aside of the database table, to allow for bulk reset of the table on a regular basis
 * Default active state is stored in the chaindata-provider, in the isDefault property.
 * We only store overrides here to reduce storage consumption.
 */
class ActiveChainsStore extends StorageProvider<ActiveChains> {
  constructor(initialData = {}) {
    super("activeChains", initialData)
  }
}

/** @deprecated use activeNetworksStore */
export const activeChainsStore = new ActiveChainsStore()
