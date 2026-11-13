import type { SubDTaoToken } from "@talismn/chaindata-provider"

/** "SN4 Targon": how a subnet's alpha is named wherever a symbol alone is ambiguous */
export const dTaoTokenLabel = (token: Pick<SubDTaoToken, "netuid" | "subnetName" | "symbol">) =>
  `SN${token.netuid} ${token.subnetName || token.symbol}`
