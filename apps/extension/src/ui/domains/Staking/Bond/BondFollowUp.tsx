import { TxProgress } from "../../Transactions"
import { useBondModal } from "./useBondModal"
import { useBondWizard } from "./useBondWizard"

export const BondFollowUp = () => {
  const { close } = useBondModal()
  const { hash, token } = useBondWizard()

  if (!hash || !token?.chain?.id) return null

  return <TxProgress hash={hash} networkIdOrHash={token.chain.id} onClose={close} />
}
