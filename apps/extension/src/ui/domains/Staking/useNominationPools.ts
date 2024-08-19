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
          return "Talisman Pool 1"
        case 16:
          return "Talisman Pool 2"
        default:
          return `Pool ${i}`
      }
    }
    return range(1, 20)
      .map((i) => {
        const commission = Number((Math.random() / 10).toFixed(4))
        const apy = 0.18 - commission
        return {
          id: i,
          name: getName(i),
          chainId,
          balance: 10000000000n * BigInt(Math.round(Math.random() * 10000000)),
          commission,
          members: Math.floor(Math.random() * 8000),
          apy,
        }
      })
      .sort((a, b) => {
        if (a.name.startsWith("Talisman")) return -1
        if (b.name.startsWith("Talisman")) return 1
        return 0
      })
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
