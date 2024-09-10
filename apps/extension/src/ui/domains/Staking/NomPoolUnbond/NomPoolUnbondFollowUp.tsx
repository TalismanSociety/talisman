import { TxProgress } from "../../Transactions"
import { useNomPoolUnbondModal } from "./useNomPoolUnbondModal"
import { useNomPoolUnbondWizard } from "./useNomPoolUnbondWizard"

export const NomPoolUnbondFollowUp = () => {
  const { close } = useNomPoolUnbondModal()
  const { hash, token } = useNomPoolUnbondWizard()

  if (!hash || !token?.chain?.id) return null

  return <TxProgress hash={hash} networkIdOrHash={token.chain.id} onClose={close} />
}
