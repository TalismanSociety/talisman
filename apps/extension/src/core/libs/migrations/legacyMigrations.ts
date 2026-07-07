import { TALISMAN_WEB_APP_DOMAIN } from "@common/constants"
import { lt } from "semver"
import sitesAuthorisedStore from "../../domains/sitesAuthorised/store"

export const migrateConnectAllSubstrate = async (previousVersion: string) => {
  if (!lt(previousVersion, "1.14.0")) return
  // once off migration to add `connectAllSubstrate` to the record for the Talisman Web App
  const site = await sitesAuthorisedStore.get(TALISMAN_WEB_APP_DOMAIN)
  if (!site) {
    const localData = await chrome.storage.local.get()
    const addresses = Object.entries(localData)
      .filter(([key]) => key.startsWith("account:0x"))
      .map(([, value]: [string, { address: string }]) => value.address)

    sitesAuthorisedStore.set({
      [TALISMAN_WEB_APP_DOMAIN]: {
        addresses,
        connectAllSubstrate: true,
        id: TALISMAN_WEB_APP_DOMAIN,
        origin: "Talisman",
        url: `https://${TALISMAN_WEB_APP_DOMAIN}`,
      },
    })
  }
}
