import { ledgerNetworks } from "./common"

export const useLedgerAppNetworkName = (genesisHash?: string | null) => {
  if (!genesisHash) return null
  const network = ledgerNetworks.find((n) => n.genesisHash === genesisHash)
  return network?.name ?? "unknown network"
}
