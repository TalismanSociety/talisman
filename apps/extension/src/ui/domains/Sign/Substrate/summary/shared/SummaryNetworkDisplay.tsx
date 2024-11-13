import { ChainId, EvmNetworkId } from "extension-core"
import { FC, useMemo } from "react"

import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useChain, useEvmNetwork } from "@ui/state"

export const SummaryNetworkDisplay: FC<{ networkId: ChainId | EvmNetworkId }> = ({ networkId }) => {
  const chain = useChain(networkId)
  const evmNetwork = useEvmNetwork(networkId)

  const name = useMemo(
    () => chain?.name ?? evmNetwork?.name ?? "Unknown network",
    [chain, evmNetwork],
  )

  return (
    <span className="text-body truncate whitespace-nowrap font-bold">
      <ChainLogo id={networkId} className="inline-block size-[1.2em]" />
      <span className="truncate pl-2">{name}</span>
    </span>
  )
}
