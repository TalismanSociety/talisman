import { classNames } from "@talismn/util"
import { BalanceDto } from "extension-core"
import { FC, useEffect, useState } from "react"
import { Modal } from "talisman-ui"

import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"
import { useTokens } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { DepositProgressBar } from "./components/DepositProgressBar"
import { WithdrawDetails } from "./components/WithdrawDetails"
import { WithdrawFundsProvider } from "./components/WithdrawFundsProvider"
import { WithdrawSubmitButton } from "./components/WithdrawSubmitButton"
import { useWithdrawWizard, WithdrawWizardProvider } from "./context/WithdrawWizardContext"
import { mapYieldTokenToTokenId } from "./utils/tokenMapping"

interface ConfirmWithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  yieldId: string
  account: string
  balance: BalanceDto
  validatorAddress?: string
}

const ConfirmWithdrawModalContent: FC<ConfirmWithdrawModalProps> = ({
  isOpen,
  onClose,
  yieldId,
  account,
  balance,
  validatorAddress,
}) => {
  const { set, setBalance } = useWithdrawWizard()
  const [currentStep, setCurrentStep] = useState<"confirm" | "progress">("confirm")
  const [progress, setProgress] = useState<{ networkId: string; txId: string } | null>(null)
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

  if (IS_POPUP) return null

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <div
        id="withdraw-modal-content"
        className={classNames(
          "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
          !IS_POPUP && "border-grey-800 rounded border",
        )}
      >
        <WithdrawFundsProvider>
          <div className="flex h-full w-full flex-col">
            {/* Header */}
            <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
              <div className="text-base font-bold text-white">Withdraw</div>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep("confirm")
                  onClose()
                }}
                className="text-body-secondary hover:text-body absolute right-10 text-xl"
              >
                ×
              </button>
            </div>

            {/* Confirm step */}
            {currentStep === "confirm" && (
              <>
                <div className="flex flex-col gap-16 px-10 pb-4">
                  <div className="text-body text-center text-lg font-bold">{`You're withdrawing`}</div>
                  <div className="flex flex-col gap-32">
                    <DepositProgressBar
                      currentStep={1}
                      tokenSymbol={balance.token.symbol}
                      labels={["Prepare", "Withdraw"]}
                    />
                    <WithdrawDetails />
                  </div>
                </div>
                <div className="grow overflow-hidden pt-0">
                  <div className="flex h-full w-full flex-col px-12 pb-8">
                    <div className="mt-auto">
                      <WithdrawSubmitButton
                        onTxSubmitted={({ networkId, txId }) => {
                          setCurrentStep("progress")
                          setProgress({ networkId, txId })
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Progress step */}
            {currentStep === "progress" && progress && (
              <Modal containerId="main" isOpen={true} onDismiss={onClose}>
                <div className="relative h-full w-[40rem] bg-black px-12 py-8">
                  <SendFundsProgress
                    networkId={progress.networkId}
                    txId={progress.txId}
                    onClose={onClose}
                  />
                </div>
              </Modal>
            )}
          </div>
        </WithdrawFundsProvider>
      </div>
    </Modal>
  )
}

export const ConfirmWithdrawModal: FC<ConfirmWithdrawModalProps> = (props) => {
  return (
    <WithdrawWizardProvider>
      <ConfirmWithdrawModalContent {...props} />
    </WithdrawWizardProvider>
  )
}
