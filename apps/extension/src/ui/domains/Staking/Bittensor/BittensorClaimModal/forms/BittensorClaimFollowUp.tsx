import { TxProgress } from "@ui/domains/Transactions"

import { useBittensorClaimModal } from "../hooks/useBittensorClaimModal"
import { useBittensorClaimWizard } from "../hooks/useBittensorClaimWizard"

export const BittensorClaimFollowUp = () => {
  const { close } = useBittensorClaimModal()
  const { hash, nativeToken } = useBittensorClaimWizard()

  if (!hash || !nativeToken?.networkId) return null

  return (
    <div className="size-full p-12">
      <TxProgress hash={hash} networkIdOrHash={nativeToken?.networkId} onClose={close} />
    </div>
  )
}
