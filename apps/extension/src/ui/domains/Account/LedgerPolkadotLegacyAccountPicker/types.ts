import { LedgerAccountDefSubstrate } from "../AccountAdd/AccountAddLedger/context"
import { DerivedAccountBase } from "../DerivedAccountPickerBase"

export type LedgerPolkadotLegacyAccountPickerProps = {
  chainId: string
  onChange?: (accounts: LedgerAccountDefSubstrate[]) => void
}

export type LedgerPolkadotAccountPickerDef = DerivedAccountBase & LedgerAccountDefSubstrate
