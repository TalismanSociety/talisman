import { API_KEY_ONFINALITY } from "@core/constants"
import { featuresStore } from "@core/domains/app/store.features"
import { ChaindataProvider } from "@talismn/chaindata-provider"

export const chaindataProvider = new ChaindataProvider()

featuresStore.observable.subscribe((store) => {
  chaindataProvider.setOnfinalityApiKey(
    store.features.includes("USE_ONFINALITY_API_KEY") ? API_KEY_ONFINALITY : undefined
  )
})
