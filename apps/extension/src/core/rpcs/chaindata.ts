import { API_KEY_ONFINALITY } from "@core/constants"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"

export const chaindataProvider = new ChaindataProviderExtension({
  onfinalityApiKey: API_KEY_ONFINALITY,
})
