import { TxProgress } from "@ui/domains/Transactions"

import { useBittensorClaimSettingsModal } from "../hooks/useBittensorClaimSettingsModal"
import { useBittensorClaimSettingsWizard } from "../hooks/useBittensorClaimSettingsWizard"

export const BittensorClaimSettingsFollowUp = () => {
  const { close } = useBittensorClaimSettingsModal()
  const { hash, nativeToken } = useBittensorClaimSettingsWizard()

  if (!hash || !nativeToken?.networkId) return null

  return (
    <div className="size-full p-12">
      <TxProgress hash={hash} networkIdOrHash={nativeToken?.networkId} onClose={close} />
    </div>
  )
}
