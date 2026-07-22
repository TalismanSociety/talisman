import type { Chain } from "./types"

export const hasConstant = (chain: Chain, pallet: string, constant: string): boolean => {
  const palletDef = chain.metadata.pallets.find((p) => p.name === pallet)
  return !!palletDef?.constants.some((c) => c.name === constant)
}
