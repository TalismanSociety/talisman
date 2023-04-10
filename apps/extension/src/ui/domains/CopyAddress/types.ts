import { Address } from "@talismn/balances"
import { ChainId, TokenId } from "@talismn/chaindata-provider"

export type CopyAddressWizardInputs = {
  mode: "receive" | "copy"
  chainId?: ChainId | null
  tokenId?: TokenId
  address?: Address
}
