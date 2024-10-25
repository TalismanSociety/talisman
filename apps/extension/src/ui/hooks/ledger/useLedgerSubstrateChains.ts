import { Chain } from "extension-core"
import { useMemo } from "react"

import { AddSubstrateLedgerAppType } from "@ui/domains/Account/AccountAdd/AccountAddLedger/context"
import { useChains } from "@ui/state"

import { CHAIN_ID_TO_LEDGER_APP_NAME } from "./common"

export type ChainWithLedgerApp = Chain & {
  ledgerAppName?: string
  supportedLedgerApps: AddSubstrateLedgerAppType[]
}

export const useLedgerSubstrateChains = () => {
  const chains = useChains({ includeTestnets: false, activeOnly: false })

  // to be used with a ledger, a chain must either have CheckMetadataHash or a ledgerApp
  return useMemo<ChainWithLedgerApp[]>(() => {
    return chains
      .filter((chain) => chain.hasCheckMetadataHash || CHAIN_ID_TO_LEDGER_APP_NAME[chain.id])
      .map((chain) => ({
        ...chain,
        ledgerAppName: CHAIN_ID_TO_LEDGER_APP_NAME[chain.id],
        supportedLedgerApps: [
          chain.hasCheckMetadataHash ? AddSubstrateLedgerAppType.Generic : null,
          !chain.hasCheckMetadataHash && CHAIN_ID_TO_LEDGER_APP_NAME[chain.id]
            ? AddSubstrateLedgerAppType.Legacy
            : null,
          chain.hasCheckMetadataHash && CHAIN_ID_TO_LEDGER_APP_NAME[chain.id]
            ? AddSubstrateLedgerAppType.Migration
            : null,
        ].filter(Boolean) as AddSubstrateLedgerAppType[],
      }))
      .sort((a, b) => (a?.name ?? "").localeCompare(b.name ?? ""))
      .sort((a, b) => {
        if (a.id === "polkadot") return -1
        if (b.id === "polkadot") return 1
        return 0
      })
  }, [chains])
}

export const useLedgerSubstrateChain = (chainId: string | null | undefined) => {
  const chains = useLedgerSubstrateChains()

  return useMemo(
    () => (chainId && chains.find((chain) => chain.id === chainId)) || null,
    [chains, chainId],
  )
}
