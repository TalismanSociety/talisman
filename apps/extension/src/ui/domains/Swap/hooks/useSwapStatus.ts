import { atom, useAtom, useAtomValue } from "jotai"
import { atomFamily, unwrap } from "jotai/utils"
import { useEffect } from "react"

import {
  retryStatus as retrySimpleswapStatus,
  SimpleswapExchange,
} from "../swap-modules/simpleswap-swap-module"
import {
  retryStatus as retryStealthexStatus,
  StealthexExchange,
} from "../swap-modules/stealthex-swap-module"

export const useSwapStatus = (
  protocol?: string,
  id?: string,
): { status: (SimpleswapExchange | StealthexExchange)["status"] } | undefined => {
  const protocolAndId = protocol && id && `${protocol}::${id}`

  const swapStatus = useAtomValue(swapStatusSwrAtom(protocolAndId))
  const [cache, setCache] = useAtom(completedSwapsCacheAtom)

  useEffect(() => {
    if (!protocolAndId) return
    if (cache[protocolAndId]) return
    if (!swapStatus?.status) return

    const { status } = swapStatus
    if (
      status !== "failed" &&
      status !== "finished" &&
      status !== "expired" &&
      status !== "refunded"
    )
      return

    const newCache = { ...cache, [protocolAndId]: status }
    setCache(newCache)
    saveCompletedSwapsCache(newCache)
  }, [cache, protocolAndId, setCache, swapStatus])

  return swapStatus
}

const swapStatusSyncAtom = atomFamily((protocolAndId?: string) =>
  unwrap(swapStatusAtom(protocolAndId), (prev) => prev),
)
const swapStatusSwrAtom = atomFamily((protocolAndId?: string) =>
  atom((get) => get(swapStatusSyncAtom(protocolAndId)) ?? get(swapStatusAtom(protocolAndId))),
)

export const swapStatusAtom = atomFamily((protocolAndId?: string) =>
  atom(async (get) => {
    if (!protocolAndId) return

    const cache = get(completedSwapsCacheAtom)
    if (cache[protocolAndId]) return { status: cache[protocolAndId] }

    const [protocol, id] = protocolAndId.split("::")
    const retryStatus = (() => {
      switch (protocol) {
        case "swap-simpleswap":
          return retrySimpleswapStatus
        case "swap-stealthex":
          return retryStealthexStatus
        default:
          return
      }
    })()
    if (!retryStatus) return

    return await retryStatus(get, id)
  }),
)

const completedSwapsCacheKey = "TalismanCompletedSwapsCache"
export const loadCompletedSwapsCache = (): Record<
  string,
  "finished" | "failed" | "expired" | "refunded"
> => JSON.parse(localStorage.getItem(completedSwapsCacheKey) ?? "{}")
const saveCompletedSwapsCache = (
  cache: Record<string, "finished" | "failed" | "expired" | "refunded">,
) => localStorage.setItem(completedSwapsCacheKey, JSON.stringify(cache ?? {}))
const completedSwapsCacheAtom = atom(loadCompletedSwapsCache())
