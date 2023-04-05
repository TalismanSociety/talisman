import { Address } from "@talismn/balances"
import { ChainId, TokenId } from "@talismn/chaindata-provider"

export type CopyAddressByTokenWizardInputs = {
  type: "token"
  tokenId?: TokenId
  address?: Address
}

export type CopyAddressByChainWizardInputs = {
  type: "chain"
  chainId?: ChainId
  address?: Address
}

export type CopyAddressRawWizardInputs = {
  type: "raw"
  address: Address
}

export type CopyAddressWizardInputs =
  | CopyAddressByTokenWizardInputs
  | CopyAddressByChainWizardInputs
  | CopyAddressRawWizardInputs
