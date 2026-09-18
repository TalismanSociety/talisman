import Blockaid from "@blockaid/client"
import { BLOCKAID_API_URL } from "@common/constants"
import { gandalfFetch } from "@ui/util/gandalfFetch"

export const blockaid = new Blockaid({
  baseURL: BLOCKAID_API_URL,
  fetch: gandalfFetch,
  // v1 renamed the option `clientId` → `clientID`
  clientID: "talisman",
})
