import useChains from "@ui/hooks/useChains"
import { useMemo } from "react"

import { ledgerNetworks } from "./common"

export const useLedgerChains = () => {
  const { chains } = useChains({ activeOnly: false, includeTestnets: true })

  const ledgerChains = useMemo(
    () =>
      (chains || [])
        .filter((c) => ledgerNetworks.some((n) => n.genesisHash === c.genesisHash))
        .sort(
          (c1, c2) =>
            (c1.sortIndex ?? Number.MAX_SAFE_INTEGER) - (c2.sortIndex ?? Number.MAX_SAFE_INTEGER)
        ),
    [chains]
  )

  return ledgerChains
}
