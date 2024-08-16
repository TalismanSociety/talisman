import { sleep } from "@talismn/util"
import { ChainId } from "extension-core"
import { atom, useAtomValue } from "jotai"
import { atomFamily } from "jotai/utils"
import { range } from "lodash"
import { useMemo } from "react"

const poolsAtomFamily = atomFamily((chainId: ChainId | null | undefined) =>
  atom(async (_get) => {
    if (!chainId) return []

    await sleep(1500)
    const getName = (i: number) => {
      switch (i) {
        case 12:
          return "Talisman Pool"
        case 16:
          return "Talisman Pool 2"
        default:
          return `Pool ${i}`
      }
    }
    return range(1, 20).map((i) => ({ id: i, name: getName(i), chainId }))
  })
)

export const useNominationPools = (chainId: ChainId | null | undefined) => {
  return useAtomValue(poolsAtomFamily(chainId))
}

export const useNominationPool = (
  chainId: ChainId | null | undefined,
  poolId: number | null | undefined
) => {
  const pools = useNominationPools(chainId)

  return useMemo(() => pools.find((pool) => pool.id === poolId) || null, [poolId, pools])
}
