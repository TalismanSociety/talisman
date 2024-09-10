import { TxProgress } from "../../Transactions"
import { useNomPoolBondModal } from "./useNomPoolBondModal"
import { useNomPoolBondWizard } from "./useNomPoolBondWizard"

export const NomPoolBondFollowUp = () => {
  const { close } = useNomPoolBondModal()
  const { hash, token } = useNomPoolBondWizard()

  if (!hash || !token?.chain?.id) return null

  return <TxProgress hash={hash} networkIdOrHash={token.chain.id} onClose={close} />
}
