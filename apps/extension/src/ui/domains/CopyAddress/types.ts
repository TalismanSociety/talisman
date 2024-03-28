import { Address } from "@talismn/balances"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"

export type CopyAddressWizardInputs = {
  networkId?: ChainId | EvmNetworkId | null
  address?: Address
  qr?: boolean
}
