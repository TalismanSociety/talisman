import { useMemo } from "react"
import { ledgerNetworks } from "./common"

export const useLedgerSubstrateApp = (genesisHash?: string | null) => {
  return useMemo(() => ledgerNetworks.find((n) => n.genesisHash === genesisHash), [genesisHash])
}
