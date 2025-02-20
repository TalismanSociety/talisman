import { TxProgress } from "../../Transactions"
import { useNomPoolWithdrawModal } from "./useNomPoolWithdrawModal"
import { useNomPoolWithdrawWizard } from "./useNomPoolWithdrawWizard"

export const NomPoolWithdrawFollowUp = () => {
  const { close } = useNomPoolWithdrawModal()
  const { hash, token } = useNomPoolWithdrawWizard()

  if (!hash || !token?.chain?.id) return null

  return <TxProgress hash={hash} networkIdOrHash={token.chain.id} onClose={close} />
}
