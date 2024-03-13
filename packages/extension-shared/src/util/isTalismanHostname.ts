import { DEBUG, TALISMAN_WEB_APP_DOMAIN } from "../constants"

export const isTalismanHostname = (hostname: string | undefined) => {
  return (
    hostname === TALISMAN_WEB_APP_DOMAIN ||
    (DEBUG && hostname?.endsWith(".orb.local")) ||
    (DEBUG && hostname?.endsWith(".talisman.pages.dev")) ||
    (DEBUG && ["localhost", "127.0.0.1"].includes(hostname ?? ""))
  )
}
