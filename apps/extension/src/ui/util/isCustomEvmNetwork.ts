import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"

export const isCustomEvmNetwork = <T extends EvmNetwork>(
  network?: T | null | CustomEvmNetwork
): network is CustomEvmNetwork => {
  return !!network && "isCustom" in network && network.isCustom
}
