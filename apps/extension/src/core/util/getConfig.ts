import { TALISMAN_CONFIG_URL } from "@core/constants"
import { FeatureVariants } from "@core/domains/app/types"
import toml from "toml"

type Config = {
  featureFlags: FeatureVariants
}

export const CONFIG_RATE_LIMIT_ERROR = "Rate Limit Exceeded"

export const getConfig = async (): Promise<Config> => {
  const response = await fetch(TALISMAN_CONFIG_URL)
  if (response.status === 429) throw new Error(CONFIG_RATE_LIMIT_ERROR)
  const text = await response.text()
  try {
    return toml.parse(text)
  } catch (e) {
    throw new Error("Unable to parse config.toml", { cause: e })
  }
}
