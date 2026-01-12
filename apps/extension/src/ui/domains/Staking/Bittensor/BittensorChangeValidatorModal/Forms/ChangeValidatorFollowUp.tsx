import { TxProgress } from "../../../../Transactions"
import { useBittensorChangeValidatorWizard } from "../../hooks/useBittensorChangeValidatorWizard"

export const ChangeValidatorFollowUp = () => {
  const { hash, nativeToken, close } = useBittensorChangeValidatorWizard()

  if (!hash || !nativeToken?.networkId) return null

  return (
    <div className="size-full p-12 pt-24">
      <TxProgress hash={hash} networkIdOrHash={nativeToken.networkId} onClose={close} />
    </div>
  )
}
