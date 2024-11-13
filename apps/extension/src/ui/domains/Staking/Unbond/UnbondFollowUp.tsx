import { TxProgress } from "../../Transactions"
import { useUnbondModal } from "./useUnbondModal"
import { useUnbondWizard } from "./useUnbondWizard"

export const UnbondFollowUp = () => {
  const { close } = useUnbondModal()
  const { hash, token, handleSuccess } = useUnbondWizard()

  if (!hash || !token?.chain?.id) return null

  return (
    <TxProgress
      hash={hash}
      networkIdOrHash={token.chain.id}
      onClose={close}
      onSuccess={handleSuccess}
    />
  )
}
