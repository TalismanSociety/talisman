import { TxProgress } from "../../Transactions"
import { useBondModal } from "./hooks/useBondModal"
import { useBondWizard } from "./hooks/useBondWizard"

export const BondFollowUp = () => {
  const { close } = useBondModal()
  const { hash, token } = useBondWizard()

  if (!hash || !token?.chain?.id) return null

  return <TxProgress hash={hash} networkIdOrHash={token.chain.id} onClose={close} />
}
