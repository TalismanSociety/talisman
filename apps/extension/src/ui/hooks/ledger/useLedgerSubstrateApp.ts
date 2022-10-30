import { useMemo } from "react"
import { ledgerNetworks } from "./common"

export const useLedgerSubstrateApp = (genesisHash?: string | null) => {
  return useMemo(
    () =>
      genesisHash
        ? ledgerNetworks.find((n) => n.genesisHash === genesisHash) ?? {
            name: "",
            genesisHash: "",
            label: "Unknown app",
          }
        : null,
    [genesisHash]
  )
}
