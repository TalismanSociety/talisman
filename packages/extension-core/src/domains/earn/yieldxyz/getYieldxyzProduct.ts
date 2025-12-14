import TTLCache from "@isaacs/ttlcache"
import { YieldDto } from "@yieldxyz/sdk"

import { yieldxyz } from "./yieldxyz"

// Products dont change and can be kept in memory for 10 minutes
const productCache = new TTLCache<string, Promise<YieldDto>>({ ttl: 600_000 })

export const getYieldxyzProduct = (
  yieldId: string,
  signal: AbortSignal,
): Promise<YieldDto | null> => {
  signal.throwIfAborted()
  if (!productCache.has(yieldId)) productCache.set(yieldId, yieldxyz.getYield(yieldId))
  return productCache.get(yieldId)!
}
