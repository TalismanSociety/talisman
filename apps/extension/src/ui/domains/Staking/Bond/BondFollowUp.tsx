import { TxProgress } from "../../Transactions"
import { useBondModal } from "./hooks/useBondModal"
import { useBondWizard } from "./hooks/useBondWizard"

export const BondFollowUp = () => {
  const { close } = useBondModal()
  const { hash, token } = useBondWizard()

  if (!hash || !token?.networkId) return null

  return <TxProgress hash={hash} networkIdOrHash={token.networkId} onClose={close} />
}
