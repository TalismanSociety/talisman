import type { SignerPayloadJSON } from "@core/types/pjsInterop"
import { ERA_PERIOD, type ScaleApi } from "@talismn/sapi"
import { type keepPreviousData, type QueryKey, useQuery } from "@tanstack/react-query"

import { useBlockTimeMs } from "./useBlockTimeMs"

// rebuild well within the mortal era, so a form left open for a while does not submit an
// expired payload (the node rejects it as a bad signature)
const PAYLOAD_REFRESH_BLOCKS = ERA_PERIOD / 4
// a rebuild can be late (throttled background tab, failed rebuild): past this age the payload
// is withheld until a fresh one lands
const PAYLOAD_MAX_AGE_BLOCKS = ERA_PERIOD / 2

export const getPayloadRefreshIntervalMs = (blockTimeMs: number) =>
  blockTimeMs * PAYLOAD_REFRESH_BLOCKS

export const isPayloadExpired = (builtAt: number, blockTimeMs: number, now: number) =>
  now - builtAt > blockTimeMs * PAYLOAD_MAX_AGE_BLOCKS

type UseSignerPayloadQueryOptions<T> = {
  sapi: ScaleApi | null | undefined
  queryKey: QueryKey
  queryFn: () => Promise<T | null> | T | null
  enabled?: boolean
  placeholderData?: typeof keepPreviousData
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
}: UseSignerPayloadQueryOptions<T>) => {
  const blockTimeMs = useBlockTimeMs(sapi)

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      // stamped on the data rather than read from dataUpdatedAt, which is 0 for placeholder data
      const builtAt = Date.now()
      const result = await queryFn()
      return result && { ...result, builtAt }
    },
    enabled,
    placeholderData,
    refetchInterval: (query) =>
      blockTimeMs && query.state.data ? getPayloadRefreshIntervalMs(blockTimeMs) : false,
    // the interval only ticks in a focused tab by default
    refetchIntervalInBackground: true,
  })

  const isExpired =
    !!blockTimeMs && !!query.data && isPayloadExpired(query.data.builtAt, blockTimeMs, Date.now())

  return {
    data: isExpired ? undefined : query.data,
    isPlaceholderData: query.isPlaceholderData,
    isLoading: query.isLoading || isExpired,
    isError: query.isError,
    error: query.error,
  }
}
