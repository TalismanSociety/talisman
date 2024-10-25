import { UiAccountAddressType } from "extension-core"

import { AddSubstrateLedgerAppType } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"

export const isUiAccountAddressType = (v: unknown): v is UiAccountAddressType =>
  typeof v === "string" && ["ethereum", "sr25519"].includes(v)

export const isAddSubstrateLedgerAppType = (v: unknown): v is AddSubstrateLedgerAppType =>
  typeof v === "string" &&
  [
    AddSubstrateLedgerAppType.Generic,
    AddSubstrateLedgerAppType.Legacy,
    AddSubstrateLedgerAppType.Migration,
  ].includes(v as AddSubstrateLedgerAppType)
