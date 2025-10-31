import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"

import { useWithdrawFundsContext } from "../WithdrawFundsProvider"

export const NetworkRow = () => {
  const { network } = useWithdrawFundsContext()

  if (!network) return null

  return (
    <div className="flex w-full items-center justify-between">
      <div className="text-grey-400">Network</div>
      <div className="flex items-center gap-2">
        <NetworkLogo networkId={network.id} className="size-6" />
        <NetworkName networkId={network.id} />
      </div>
    </div>
  )
}
