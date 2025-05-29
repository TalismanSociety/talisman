import { SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import { ChainId } from "extension-core"

import { LedgerAccountDefSubstrate } from "../AccountAdd/AccountAddLedger/context"
import { DerivedAccountBase } from "../DerivedAccountPickerBase"

export type LedgerPolkadotGenericAccountPickerProps = {
  onChange?: (accounts: LedgerAccountDefSubstrate[]) => void
  app?: SubstrateAppParams | null
  chainId?: ChainId
}

export type LedgerPolkadotAccountPickerDef = DerivedAccountBase & LedgerAccountDefSubstrate
