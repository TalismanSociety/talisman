import { API_KEY_ONFINALITY } from "@core/constants"
import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"

export const chaindataProvider = new ChaindataProviderExtension()

remoteConfigStore.observable.subscribe((config) => {
  chaindataProvider.setOnfinalityApiKey(
    config.featureFlags.USE_ONFINALITY_API_KEY ? API_KEY_ONFINALITY : undefined
  )
})
