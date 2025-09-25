import { Suspense, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { DepositDetails } from "@ui/domains/Earn/components/DepositDetails"
import { DepositProgressBar } from "@ui/domains/Earn/components/DepositProgressBar"
import { SequentialTransactionExecutor } from "@ui/domains/Earn/components/SequentialTransactionExecutor"
import { useDepositFunds } from "@ui/domains/Earn/components/useDepositFunds"
import { YieldSubmitButton } from "@ui/domains/Earn/components/YieldSubmitButton"
import {
  DepositWizardProvider,
  useDepositWizard,
} from "@ui/domains/Earn/context/DepositWizardContext"
import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"

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

const DepositConfirmContent = () => {
  const [searchParams] = useSearchParams()
  const [currentStep, setCurrentStep] = useState<"confirm" | "execute" | "progress">("confirm")
  const [transactionStep, setTransactionStep] = useState<1 | 2>(1)
  const { set, resetUserInput } = useDepositWizard()
  const { token } = useDepositFunds()
  const [progress, setProgress] = useState<{ networkId: string; txId: string } | null>(null)

  // Get parameters from URL
  const account = searchParams.get("account") || ""
  const tokenId = searchParams.get("tokenId") || ""
  const productId = searchParams.get("productId") || ""

  // Initialize the wizard with the provided parameters
  useEffect(() => {
    if (account && tokenId && productId) {
      set("account", account)
      set("tokenId", tokenId)
      set("productId", productId)
    }
  }, [account, tokenId, productId, set])

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
    // Navigate back to portfolio
    window.location.href = "/portfolio"
  }

  return (
    <div className="flex size-full flex-grow flex-col bg-black">
      <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
        <div className="text-base font-bold text-white">Staking</div>
        <button
          type="button"
          onClick={handleClose}
          className="text-body-secondary hover:text-body absolute right-10 text-xl"
        >
          ×
        </button>
      </div>

      <div className="px-10 pb-4">
        <div className="text-body text-center text-lg font-bold">You're approving staking</div>
        <div className="mt-12">
          <DepositProgressBar
            currentStep={transactionStep}
            tokenSymbol={token?.symbol || "Token"}
          />
        </div>
        <div className="mt-16">
          <DepositDetails />
        </div>
      </div>

      <div className="grow overflow-hidden pt-0">
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

export const DepositConfirm = () => {
  return (
    <Suspense fallback={<SuspenseTracker name="DepositConfirm" />}>
      <DepositWizardProvider>
        <DepositConfirmContent />
      </DepositWizardProvider>
    </Suspense>
  )
}
