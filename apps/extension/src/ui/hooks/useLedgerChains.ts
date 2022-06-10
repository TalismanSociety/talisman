import ledgerNetworks from "@core/util/ledgerNetworks"
import useChains from "@ui/hooks/useChains"
import { useMemo } from "react"

export const useLedgerChains = () => {
  const chains = useChains()

  const ledgerChains = useMemo(
    () =>
      (chains || [])
        .filter((c) =>
          ledgerNetworks.some((lc) => lc.genesisHash.includes(c.genesisHash as string))
        )
        .sort(
          (c1, c2) =>
            (c1.sortIndex ?? Number.MAX_SAFE_INTEGER) - (c2.sortIndex ?? Number.MAX_SAFE_INTEGER)
        ),
    [chains]
  )
  return ledgerChains
}
