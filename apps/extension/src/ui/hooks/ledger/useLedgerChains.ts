import ledgerNetworks from "@core/util/ledgerNetworks"
import useChains from "@ui/hooks/useChains"
import { useMemo } from "react"

// this should live in chaindata in the future
const networksWithLedgerApp = [
  {
    name: "polkadot",
    genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
  },
  {
    name: "kusama",
    genesisHash: "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe",
  },
]

export const useLedgerChains = () => {
  const chains = useChains()

  const ledgerChains = useMemo(
    () =>
      (chains || [])
        .filter((c) =>
          ledgerNetworks.some((lc) => lc.genesisHash.includes(c.genesisHash as string))
        )
        .filter((c) => networksWithLedgerApp.some((lc) => lc.genesisHash === c.genesisHash))
        .sort(
          (c1, c2) =>
            (c1.sortIndex ?? Number.MAX_SAFE_INTEGER) - (c2.sortIndex ?? Number.MAX_SAFE_INTEGER)
        ),
    [chains]
  )
  return ledgerChains
}
