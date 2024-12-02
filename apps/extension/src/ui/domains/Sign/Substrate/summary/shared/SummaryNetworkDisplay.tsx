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
    <span className="text-body truncate whitespace-nowrap">
      <ChainLogo id={networkId} className="inline-block size-[1.2em] align-sub" />
      <span className="ml-[0.3em] truncate">{name}</span>
    </span>
  )
}
