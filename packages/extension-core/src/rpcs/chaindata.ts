import { ChaindataProvider } from "@talismn/chaindata-provider"

import {
  loadChaindataPersistedStorage,
  streamChaindataStorageChangesToDisk,
} from "../domains/chaindata/store.chaindata"
import { customChaindataStore } from "../domains/chaindata/store.customChaindata"

export const chaindataProvider = new ChaindataProvider({
  persistedStorage: loadChaindataPersistedStorage(),
  customChaindata$: customChaindataStore.observable$,
})

streamChaindataStorageChangesToDisk(chaindataProvider.storage$)
