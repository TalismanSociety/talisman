import { ChaindataProvider } from "@talismn/chaindata-provider"

import {
  loadChaindataPersistedStorage,
  streamChaindataStorageChangesToDisk,
} from "../domains/chaindata/store.chaindata"
import { customChaindataStore } from "../domains/chaindata/store.customChaindata"
import { dynamicTokensStore$ } from "../domains/chaindata/store.dynamicTokens"

export const chaindataProvider = new ChaindataProvider({
  persistedStorage: loadChaindataPersistedStorage(),
  customChaindata$: customChaindataStore.observable$,
  dynamicTokens$: dynamicTokensStore$,
})

streamChaindataStorageChangesToDisk(chaindataProvider.storage$)
