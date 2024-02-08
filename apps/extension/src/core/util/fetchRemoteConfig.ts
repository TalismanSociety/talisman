import { TALISMAN_CONFIG_URL } from "@core/constants"
import { RemoteConfigStoreData } from "@core/domains/app/types"
import { log } from "@core/log"
import toml from "toml"

export const fetchRemoteConfig = async () => {
  log.debug("Fetching config.toml")
  const response = await fetch(TALISMAN_CONFIG_URL)

  if (!response.ok)
    throw new Error(`Unable to fetch config.toml: ${response.status} ${response.statusText}`)

  const text = await response.text()
  try {
    return toml.parse(text) as RemoteConfigStoreData
  } catch (e) {
    throw new Error("Unable to parse config.toml", { cause: e })
  }
}
