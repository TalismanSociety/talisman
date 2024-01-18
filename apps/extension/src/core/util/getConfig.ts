import { TALISMAN_CONFIG_URL } from "@core/constants"
import { FeatureVariants } from "@core/domains/app/types"
import { log } from "@core/log"
import { TokenId } from "@talismn/chaindata-provider"
import toml from "toml"

type Config = {
  featureFlags: FeatureVariants
  buyTokens: {
    tokenIds: TokenId[]
  }
}

export const CONFIG_RATE_LIMIT_ERROR = "Rate Limit Exceeded"

export const getConfig = async (): Promise<Config | null> => {
  try {
    // eslint-disable-next-line no-var
    var response = await fetch(TALISMAN_CONFIG_URL)
  } catch (e) {
    log.error("Unable to fetch config.toml", { cause: e })
    return null
  }

  if (response.status === 429) throw new Error(CONFIG_RATE_LIMIT_ERROR)
  if (!response.ok) throw new Error(`Unable to fetch config.toml: ${response.statusText}`)

  const text = await response.text()
  try {
    return toml.parse(text)
  } catch (e) {
    throw new Error("Unable to parse config.toml", { cause: e })
  }
}
