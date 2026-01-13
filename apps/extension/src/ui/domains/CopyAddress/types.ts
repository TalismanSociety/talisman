import type { Address } from "@talismn/balances"
import type { NetworkId } from "@talismn/chaindata-provider"

export type CopyAddressWizardInputs = {
  networkId?: NetworkId | null
  address?: Address
  qr?: boolean
  legacyFormat?: boolean
  addresses?: Address[]
}
