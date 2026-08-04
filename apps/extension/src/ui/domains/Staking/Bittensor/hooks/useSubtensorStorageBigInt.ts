import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"

import { getStorageDefault, toBigIntStrict } from "../utils/storageDefault"

/**
 * Reads a numeric SubtensorModule storage entry, falling back to its metadata default when
 * unset — Root Reborn ships several of its entries unset, and reading them as zero would
 * open gates the chain keeps closed.
 * @see getStorageDefault
 */
export const useSubtensorStorageBigInt = (
  sapi: ScaleApi | null | undefined,
  entry: string,
  keys: unknown[] = []
) =>
  useQuery({
    queryKey: ["subtensorStorageBigInt", sapi?.id, entry, keys],
    queryFn: async () => {
      if (!sapi) throw new Error("Chain connection not ready")
      const value = await sapi.getStorage<bigint>("SubtensorModule", entry, keys)
      return value != null
        ? toBigIntStrict(value)
        : getStorageDefault(sapi, "SubtensorModule", entry)
    },
    enabled: !!sapi,
  })
