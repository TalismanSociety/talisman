import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { activeEvmNetworksStore } from "../store.activeEvmNetworks"

export const migrateToNewDefaultEvmNetworks: Migration = {
  forward: new MigrationFunction(async () => {
    await activeEvmNetworksStore.set({
      "787": true, // Acala EVM
      "46": true, // Darwinia EVM
      "2021": true, // Edgeware EVM
      "100": true, // Gnosis
      "1285": true, // Moonriver,
      "336": true, // Shiden EVM
    })
  }),
}
