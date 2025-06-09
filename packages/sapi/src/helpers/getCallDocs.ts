import log from "../log"
import { Chain } from "./types"

export const getCallDocs = (chain: Chain, pallet: string, method: string): string | null => {
  try {
    const typeIdCalls = chain.metadata.pallets.find(({ name }) => name === pallet)?.calls?.type
    if (!typeIdCalls) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let palletCalls: any = chain.metadata.lookup[typeIdCalls]
    if (!palletCalls || palletCalls.id !== typeIdCalls)
      palletCalls = chain.metadata.lookup.find((v) => v.id === typeIdCalls)

    if (!palletCalls) return null

    const call = palletCalls.def.value.find(
      (c: { name: string; docs?: string[] | null }) => c.name === method,
    )

    return call?.docs?.join("\n") ?? null
  } catch (err) {
    log.error("Failed to find call docs", { pallet, method, chain })
    return null
  }
}
