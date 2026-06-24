import { TxProgress } from "@ui/domains/Transactions"

import { useBittensorSettingsModal } from "../hooks/useBittensorSettingsModal"
import { useBittensorSettingsWizard } from "../hooks/useBittensorSettingsWizard"

export const BittensorSettingsFollowUp = () => {
  const { close } = useBittensorSettingsModal()
  const { hash, nativeToken } = useBittensorSettingsWizard()

  if (!hash || !nativeToken?.networkId) return null

  return (
    <div className="size-full p-12">
      <TxProgress hash={hash} networkIdOrHash={nativeToken?.networkId} onClose={close} />
    </div>
  )
}
