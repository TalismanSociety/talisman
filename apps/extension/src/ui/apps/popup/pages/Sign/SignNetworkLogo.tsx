import type { Network } from "@talismn/chaindata-provider"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import type { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

export const SignNetworkLogo: FC<{ network: Network | null | undefined }> = ({ network }) => {
  if (!network) return null

  return (
    <Tooltip placement="bottom-end">
      <TooltipTrigger className="inline-block">
        <NetworkLogo className="text-xl" networkId={network.id} />
      </TooltipTrigger>
      <TooltipContent>{network.name}</TooltipContent>
    </Tooltip>
  )
}
