import { TxProgress } from "../../../../Transactions"
import { useBittensorBondModal } from "../../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"

export const BittensorBondFollowUp = () => {
  const { close } = useBittensorBondModal()
  const { hash, nativeToken } = useBittensorBondWizard()

  if (!hash || !nativeToken?.networkId) return null

  return <TxProgress hash={hash} networkIdOrHash={nativeToken.networkId} onClose={close} />
}
