import { TxProgress } from "../../../../Transactions"
import { useBittensorBondModal } from "../../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"

export const BittensorBondFollowUp = () => {
  const { close } = useBittensorBondModal()
  const { hash, token } = useBittensorBondWizard()

  if (!hash || !token?.networkId) return null

  return <TxProgress hash={hash} networkIdOrHash={token.networkId} onClose={close} />
}
