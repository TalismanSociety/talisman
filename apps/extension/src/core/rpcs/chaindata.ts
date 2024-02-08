import { API_KEY_ONFINALITY } from "@core/constants"
import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { ChaindataProvider } from "@talismn/chaindata-provider"

export const chaindataProvider = new ChaindataProvider()

remoteConfigStore.observable.subscribe((config) => {
  chaindataProvider.setOnfinalityApiKey(
    config.featureFlags.USE_ONFINALITY_API_KEY ? API_KEY_ONFINALITY : undefined
  )
})
