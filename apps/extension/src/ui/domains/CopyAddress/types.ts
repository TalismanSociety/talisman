import { Address } from "@talismn/balances"
import { ChainId, TokenId } from "@talismn/chaindata-provider"

export type CopyAddressWizardInputs = {
  type: "token" | "chain"
  chainId?: ChainId
  tokenId?: TokenId
  address?: Address
}
