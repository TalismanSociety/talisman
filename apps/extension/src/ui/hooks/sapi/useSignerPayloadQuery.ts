import type { SignerPayloadJSON } from "@core/types/pjsInterop"
import { ERA_PERIOD, type ScaleApi } from "@talismn/sapi"
import { type keepPreviousData, type QueryKey, useQuery } from "@tanstack/react-query"
import { useEffect, useReducer } from "react"

import { useBlockTimeMs } from "./useBlockTimeMs"

// the sapi builder anchors the era on the finalized block, up to half an era behind the head
const WORST_CASE_ERA_BLOCKS_LEFT = ERA_PERIOD / 2

type PayloadAge = { builtAt: number; eraBlocksLeft: number }

// rebuild well within the mortal era, so a form left open for a while does not submit an
// expired payload (the node rejects it as a bad signature)
export const getPayloadRefreshIntervalMs = (blockTimeMs: number, eraBlocksLeft: number) =>
  blockTimeMs * Math.max(1, eraBlocksLeft / 4)

// a rebuild can be late (throttled background tab, failed rebuild): past this time the payload
// is withheld until a fresh one lands
export const getPayloadExpiresAt = ({ builtAt, eraBlocksLeft }: PayloadAge, blockTimeMs: number) =>
  builtAt + (blockTimeMs * eraBlocksLeft) / 2

const getEraBlocksLeft = async (
  sapi: ScaleApi | null | undefined,
  payload: SignerPayloadJSON
): Promise<number> => {
  try {
    if (!sapi) return WORST_CASE_ERA_BLOCKS_LEFT
    const head = await sapi.getStorage<number>("System", "Number", [])
    const blocksSinceBirth = head - Number(payload.blockNumber)
    if (!Number.isFinite(blocksSinceBirth)) return WORST_CASE_ERA_BLOCKS_LEFT
    return Math.max(0, ERA_PERIOD - blocksSinceBirth)
  } catch {
    return WORST_CASE_ERA_BLOCKS_LEFT
  }
}

type UseSignerPayloadQueryOptions<T> = {
  sapi: ScaleApi | null | undefined
  queryKey: QueryKey
  queryFn: () => Promise<T | null> | T | null
  enabled?: boolean
  placeholderData?: typeof keepPreviousData
  retry?: boolean | number
}

/**
 * Builds a substrate signer payload and keeps it inside its mortal era. A payload too old to
 * sign is withheld and reported as loading.
 */
export const useSignerPayloadQuery = <T extends { payload: SignerPayloadJSON }>({
  sapi,
  queryKey,
  queryFn,
  enabled,
  placeholderData,
  retry,
}: UseSignerPayloadQueryOptions<T>) => {
  const blockTimeMs = useBlockTimeMs(sapi)

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      // stamped on the data rather than read from dataUpdatedAt, which is 0 for placeholder data
      const builtAt = Date.now()
      const result = await queryFn()
      if (!result) return null
      return { ...result, builtAt, eraBlocksLeft: await getEraBlocksLeft(sapi, result.payload) }
    },
    enabled,
    placeholderData,
    retry,
    refetchInterval: (query) =>
      blockTimeMs && query.state.data
        ? getPayloadRefreshIntervalMs(blockTimeMs, query.state.data.eraBlocksLeft)
        : false,
    // the interval only ticks in a focused tab by default
    refetchIntervalInBackground: true,
  })

  const expiresAt = blockTimeMs && query.data ? getPayloadExpiresAt(query.data, blockTimeMs) : null

  // a stalled rebuild changes no tracked query state: re-render when the payload expires
  const [, rerender] = useReducer((count: number) => count + 1, 0)
  useEffect(() => {
    if (expiresAt === null) return
    const timeout = setTimeout(rerender, Math.max(0, expiresAt - Date.now()) + 1)
    return () => clearTimeout(timeout)
  }, [expiresAt])

  const isExpired = expiresAt !== null && Date.now() > expiresAt

  return {
    data: isExpired ? undefined : query.data,
    isPlaceholderData: query.isPlaceholderData,
    isLoading: query.isLoading || isExpired,
    isError: query.isError,
    error: query.error,
  }
}
