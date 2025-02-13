import { AddSubstrateLedgerAppType } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"

export const isAddSubstrateLedgerAppType = (v: unknown): v is AddSubstrateLedgerAppType =>
  typeof v === "string" &&
  [
    AddSubstrateLedgerAppType.Generic,
    AddSubstrateLedgerAppType.Legacy,
    AddSubstrateLedgerAppType.Migration,
  ].includes(v as AddSubstrateLedgerAppType)
