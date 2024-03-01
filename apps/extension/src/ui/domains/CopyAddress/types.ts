import { Address } from "@talismn/balances"
import { ChainId } from "@talismn/chaindata-provider"

export type CopyAddressWizardInputs = {
  chainId?: ChainId | null
  address?: Address
  qr?: boolean
}
