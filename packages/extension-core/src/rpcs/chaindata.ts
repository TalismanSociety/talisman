import { ChaindataProvider } from "@talismn/chaindata-provider"

import { chaindataStorage$ } from "../domains/chaindata/store.chaindata"
import { customChaindataStore } from "../domains/chaindata/store.customChaindata"

export const chaindataProvider = new ChaindataProvider({
  storage$: chaindataStorage$,
  customChaindata$: customChaindataStore.observable$,
})
