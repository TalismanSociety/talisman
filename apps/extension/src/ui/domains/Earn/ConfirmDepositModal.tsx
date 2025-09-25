import { classNames } from "@talismn/util"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"
import { IS_POPUP } from "@ui/util/constants"

import { DepositDetails } from "./components/DepositDetails"
import { DepositProgressBar } from "./components/DepositProgressBar"
import { SequentialTransactionExecutor } from "./components/SequentialTransactionExecutor"
import { useDepositFunds } from "./components/useDepositFunds"
import { YieldSubmitButton } from "./components/YieldSubmitButton"
import { DepositWizardProvider, useDepositWizard } from "./context/DepositWizardContext"

const DepositSubmitButton = ({
  onTxSubmitted,
}: {
  onTxSubmitted?: (params: { networkId: string; txId: string }) => void
}) => {
  const { t } = useTranslation()
  const { account, token, product, deposit, transaction } = useDepositFunds()
  const [isSubmitting, _setIsSubmitting] = useState(false)

  // No fallback transaction - only use real transaction data
  const txTransaction: TxSubmitButtonTransaction | null = useMemo(() => {
    // Only proceed if we have real transaction data
    if (!account || !token || !product || !deposit || !transaction?.tx) return null

    // Use the real transaction data from Yield.xyz or useEthTransaction
    return {
      platform: "ethereum" as const,
      networkId: token.networkId as `0x${string}`,
      payload: transaction.tx,
    }
  }, [account, token, product, deposit, transaction?.tx])

  // Use Yield.xyz submit button if we have a yield transaction
  if (transaction?.isYieldTransaction) {
    return (
      <YieldSubmitButton
        label={isSubmitting ? t("Depositing...") : t("Deposit")}
        disabled={isSubmitting}
        onSuccess={(txId) => {
          if (token) onTxSubmitted?.({ networkId: token.networkId, txId })
        }}
        onError={(_error) => {}}
      />
    )
  }

  if (!txTransaction) return null

  return (
    <TxSubmitButton
      tx={txTransaction}
      label={isSubmitting ? t("Depositing...") : t("Deposit")}
      disabled={isSubmitting}
      onSubmit={(txId) => {
        if (token) onTxSubmitted?.({ networkId: token.networkId as string, txId })
      }}
    />
  )
}

interface ConfirmDepositModalProps {
  isOpen: boolean
  onClose: () => void
  account: string
  tokenId: string
  productId: string
}

const ConfirmDepositModalContent = ({
  onClose,
  account,
  tokenId,
  productId,
}: Omit<ConfirmDepositModalProps, "isOpen">) => {
  const [currentStep, setCurrentStep] = useState<"confirm" | "execute" | "progress">("confirm")
  const [transactionStep, setTransactionStep] = useState<1 | 2>(1)
  const { set, resetUserInput } = useDepositWizard()
  const { token } = useDepositFunds()
  const [progress, setProgress] = useState<{ networkId: string; txId: string } | null>(null)

  // Initialize the wizard with the provided parameters
  useEffect(() => {
    if (account && tokenId && productId) {
      set("account", account)
      set("tokenId", tokenId)
      set("productId", productId)
    }
  }, [account, tokenId, productId, set])

  // In popup mode, don't render the modal - the pages will handle the full page view
  if (IS_POPUP) {
    return null
  }

  const handleExecutionComplete = (networkId: string, txId: string) => {
    setCurrentStep("progress")
    setProgress({ networkId, txId })
  }

  const handleExecutionError = (_error: Error) => {
    // Could show error state or go back to confirm
    setCurrentStep("confirm")
  }

  const handleTransactionComplete = (networkId: string, txId: string) => {
    setProgress({ networkId, txId })
    if (transactionStep === 1) {
      setTransactionStep(2)
    }
  }

  const handleClose = () => {
    setCurrentStep("confirm")
    resetUserInput()
    onClose()
  }

  return (
    <div
      id="confirm-deposit-modal-content"
      className={classNames(
        "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
        !IS_POPUP && "border-grey-800 rounded border",
      )}
    >
      {/* Header matching SendFundsLayout pattern */}
      <div className="text-body-secondary flex h-32 min-h-[6.4rem] w-full items-center px-12">
        <div className="w-12">&nbsp;</div>
        <div className="grow text-center text-lg font-bold text-white">Staking</div>
        <button
          type="button"
          onClick={handleClose}
          className="text-body-secondary hover:text-body flex w-12 items-center justify-center text-xl"
        >
          ×
        </button>
      </div>

      {/* Main content area with consistent padding */}
      <div className="w-full grow overflow-hidden">
        <div className="flex h-full w-full flex-col items-center gap-6 px-12 pb-8">
          <div className="w-full grow">
            <div className="bg-grey-900 text-body-secondary flex flex-col rounded px-12 py-8 leading-[140%]">
              <div className="text-body mb-12 text-center text-lg font-bold">
                You're approving staking
              </div>
              <div className="mb-16">
                <DepositProgressBar
                  currentStep={transactionStep}
                  tokenSymbol={token?.symbol || "Token"}
                />
              </div>
              <div>
                <DepositDetails />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action area with consistent padding */}
      <div className="w-full">
        {currentStep === "confirm" && (
          <div className="flex h-full w-full flex-col px-12 pb-8">
            <div className="mt-auto">
              <DepositSubmitButton
                onTxSubmitted={({
                  networkId: _networkId,
                  txId: _txId,
                }: {
                  networkId: string
                  txId: string
                }) => {
                  // switch to sequential execution
                  setCurrentStep("execute")
                }}
              />
            </div>
          </div>
        )}
        {currentStep === "execute" && (
          <SequentialTransactionExecutor
            onComplete={handleExecutionComplete}
            onError={handleExecutionError}
            onTransactionComplete={handleTransactionComplete}
          />
        )}
        {currentStep === "progress" && progress && (
          <div className="h-full w-full">
            <SendFundsProgress networkId={progress.networkId} txId={progress.txId} />
          </div>
        )}
      </div>
    </div>
  )
}

export const ConfirmDepositModal = ({
  isOpen,
  onClose,
  account,
  tokenId,
  productId,
}: ConfirmDepositModalProps) => {
  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <Suspense fallback={<SuspenseTracker name="ConfirmDepositModal" />}>
        <DepositWizardProvider>
          <ConfirmDepositModalContent
            onClose={onClose}
            account={account}
            tokenId={tokenId}
            productId={productId}
          />
        </DepositWizardProvider>
      </Suspense>
    </Modal>
  )
}
