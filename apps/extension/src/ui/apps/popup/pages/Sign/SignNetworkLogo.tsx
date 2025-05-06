import { Chain, SimpleEvmNetwork } from "extension-core"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { ChainLogo } from "@ui/domains/Asset/ChainLogo"

export const SignNetworkLogo: FC<{ network: Chain | SimpleEvmNetwork | null | undefined }> = ({
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
