import { log, TALISMAN_CONFIG_URL } from "extension-shared"
import toml from "toml"

import { RemoteConfigStoreData } from "../domains/app/types"
import { mockedConfig } from "./mockedConfig"

export const fetchRemoteConfig = async () => {
  log.debug("Fetching config.toml")
  const response = await fetch(TALISMAN_CONFIG_URL)

  if (!response.ok)
    throw new Error(`Unable to fetch config.toml: ${response.status} ${response.statusText}`)

  // const text = await response.text()
  // TODO: Delete this once talisman-config PR-10 is merged
  const text = mockedConfig

  try {
    return toml.parse(text) as RemoteConfigStoreData
  } catch (e) {
    throw new Error("Unable to parse config.toml", { cause: e })
  }
}
