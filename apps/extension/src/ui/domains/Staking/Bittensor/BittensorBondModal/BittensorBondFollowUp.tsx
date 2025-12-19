import { TxProgress } from "../../../Transactions"
import { useBittensorBondModal } from "../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

export const BittensorBondFollowUp = () => {
  const { close } = useBittensorBondModal()
  const { hash, nativeToken } = useBittensorBondWizard()

  if (!hash || !nativeToken?.networkId) return null

  return (
    <div className="size-full p-12 pt-24">
      <TxProgress hash={hash} networkIdOrHash={nativeToken.networkId} onClose={close} />
    </div>
  )
}
