import type { DotNetworkId } from "@talismn/chaindata-provider"
import type { SubstrateAppParams } from "@ui/hooks/ledger/legacy"

import type { LedgerAccountDefSubstrate } from "../AccountAdd/AccountAddLedger/context"
import type { DerivedAccountBase } from "../DerivedAccountPickerBase"

export type LedgerPolkadotGenericAccountPickerProps = {
  onChange?: (accounts: LedgerAccountDefSubstrate[]) => void
  app?: SubstrateAppParams | null
  chainId?: DotNetworkId
}

export type LedgerPolkadotAccountPickerDef = DerivedAccountBase & LedgerAccountDefSubstrate
