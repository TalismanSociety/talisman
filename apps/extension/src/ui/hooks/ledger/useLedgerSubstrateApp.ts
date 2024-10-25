import { supportedApps } from "@zondax/ledger-substrate"
import { Chain } from "extension-core"
import { useMemo } from "react"

import { CHAIN_ID_TO_LEDGER_APP_NAME } from "./common"

export const useLedgerSubstrateAppByChain = (chain: Chain | null | undefined) => {
  return useMemo(
    () => supportedApps.find((app) => chain && app.name === CHAIN_ID_TO_LEDGER_APP_NAME[chain.id]),
    [chain],
  )
}

export const useLedgerSubstrateAppByName = (name: string | null | undefined) => {
  return useMemo(() => (name && supportedApps.find((app) => app.name === name)) || null, [name])
}
