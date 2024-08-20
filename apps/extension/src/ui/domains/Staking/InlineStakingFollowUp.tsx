import { TxProgress } from "../Transactions"
import { useInlineStakingModal } from "./useInlineStakingModal"
import { useInlineStakingWizard } from "./useInlineStakingWizard"

export const InlineStakingFollowUp = () => {
  const { close } = useInlineStakingModal()
  const { hash, token } = useInlineStakingWizard()

  if (!hash || !token?.chain?.id) return null

  return <TxProgress hash={hash} networkIdOrHash={token.chain.id} onClose={close} />
}
