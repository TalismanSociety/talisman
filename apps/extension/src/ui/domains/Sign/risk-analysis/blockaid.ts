import Blockaid from "@blockaid/client"
import { BLOCKAID_API_URL } from "@common/extension-shared"

export const blockaid = new Blockaid({
  baseURL: BLOCKAID_API_URL,
  clientId: "talisman",
})
