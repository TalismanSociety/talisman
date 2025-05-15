import { atom, useAtom, useAtomValue } from "jotai"
import { atomFamily, unwrap } from "jotai/utils"
import { useEffect } from "react"

import {
  completedSwapsCacheAtom,
  saveCompletedSwapsCache,
  simpleswapSwapStatusAtom,
} from "../swap-modules/simpleswap-swap-module"

export const useSimpleswapSwapStatus = (id?: string) => {
  const swapStatus = useAtomValue(swapStatusSwrAtom(id))
  const [cache, setCache] = useAtom(completedSwapsCacheAtom)

  useEffect(() => {
    if (!id) return
    if (cache[id]) return
    if (!swapStatus?.status) return

    const { status } = swapStatus
    if (status !== "failed" && status !== "finished") return

    const newCache = { ...cache, [id]: status }
    setCache(newCache)
    saveCompletedSwapsCache(newCache)
  }, [cache, id, setCache, swapStatus])

  return swapStatus
}

const swapStatusSyncAtom = atomFamily((id?: string) =>
  unwrap(simpleswapSwapStatusAtom(id), (prev) => prev),
)
const swapStatusSwrAtom = atomFamily((id?: string) =>
  atom((get) => get(swapStatusSyncAtom(id)) ?? get(simpleswapSwapStatusAtom(id))),
)
