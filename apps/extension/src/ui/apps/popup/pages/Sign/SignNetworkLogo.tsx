import { Chain, EvmNetwork } from "@extension/core"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

export const SignNetworkLogo: FC<{ network: Chain | EvmNetwork | null | undefined }> = ({
  network,
}) => {
  if (!network) return null

  return (
    <Tooltip placement="bottom-end">
      <TooltipTrigger className="inline-block">
        <ChainLogo className="text-xl" id={network.id} />
      </TooltipTrigger>
      <TooltipContent>{network.name}</TooltipContent>
    </Tooltip>
  )
}
