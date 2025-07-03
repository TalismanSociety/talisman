import { ChaindataProvider } from "@talismn/chaindata-provider"

import { customChaindataStore } from "../domains/chaindata/store"

export const chaindataProvider = new ChaindataProvider({
  customChaindata$: customChaindataStore.observable$,
})
