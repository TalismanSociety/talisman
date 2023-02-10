import { API_KEY_ONFINALITY } from "@core/constants"
import { featuresStore } from "@core/domains/app/store.features"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"

export const chaindataProvider = new ChaindataProviderExtension()

featuresStore.isFeatureEnabled("USE_ONFINALITY_API_KEY_EVM").then((enabled) => {
  chaindataProvider.setOnfinalityApiKey(enabled ? API_KEY_ONFINALITY : undefined)
})
