import Blockaid from "@blockaid/client"
import { BLOCKAID_API_URL } from "@common/constants"

export const blockaid = new Blockaid({
  baseURL: BLOCKAID_API_URL,
  // v1 renamed the option `clientId` → `clientID`
  clientID: "talisman",
})
