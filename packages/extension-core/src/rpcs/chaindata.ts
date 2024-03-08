import { ChaindataProvider } from "@talismn/chaindata-provider"
import { API_KEY_ONFINALITY } from "extension-shared"

import { remoteConfigStore } from "../domains/app/store.remoteConfig"

export const chaindataProvider = new ChaindataProvider()

remoteConfigStore.observable.subscribe((config) => {
  chaindataProvider.setOnfinalityApiKey(
    config.featureFlags.USE_ONFINALITY_API_KEY ? API_KEY_ONFINALITY : undefined
  )
})
