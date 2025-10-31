import { BalanceDto } from "extension-core"
import { FC, useEffect } from "react"
import { Modal } from "talisman-ui"

import { useTokens } from "@ui/state"

import { WithdrawAmountForm } from "./components/WithdrawAmountForm/index"
import { useWithdrawWizard, WithdrawWizardProvider } from "./context/WithdrawWizardContext"
import { mapYieldTokenToTokenId } from "./utils/tokenMapping"

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  yieldId: string
  account: string
  balance: BalanceDto
  validatorAddress?: string
}

const WithdrawModalContent: FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  onNext,
  yieldId,
  account,
  balance,
  validatorAddress,
}) => {
  const { set, setBalance } = useWithdrawWizard()
  const tokens = useTokens()

  // Set up context values when modal opens
  useEffect(() => {
    if (isOpen) {
      // Map token ID from balance data
      const tokenId = mapYieldTokenToTokenId(
        balance.token.address || balance.token.symbol,
        balance.token.network,
        tokens,
      )

      // Set context values - set amount first to ensure it's correct immediately
      set("amount", balance.amountRaw || "0")
      set("account", account)
      set("yieldId", yieldId)
      set("tokenId", tokenId || "")
      set("validatorAddress", validatorAddress || undefined)
      setBalance(balance)
    }
  }, [isOpen, account, yieldId, balance, validatorAddress, tokens, set, setBalance])

  // Additional effect to ensure amount is always correct for the current balance
  useEffect(() => {
    if (isOpen && balance) {
      set("amount", balance.amountRaw || "0")
    }
  }, [isOpen, balance, set])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <div
        id="withdraw-modal-content"
        className="border-grey-800 relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden rounded border bg-black"
      >
        <div className="flex h-full w-full flex-col">
          {/* Header */}
          <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
            <div className="text-base font-bold text-white">Withdraw</div>
            <button
              type="button"
              onClick={onClose}
              className="text-body-secondary hover:text-body absolute right-10 text-xl"
            >
              ×
            </button>
          </div>

          <WithdrawAmountForm onNext={onNext} />
        </div>
      </div>
    </Modal>
  )
}

export const WithdrawModal: FC<WithdrawModalProps> = (props) => {
  return (
    <WithdrawWizardProvider>
      <WithdrawModalContent {...props} />
    </WithdrawWizardProvider>
  )
}
