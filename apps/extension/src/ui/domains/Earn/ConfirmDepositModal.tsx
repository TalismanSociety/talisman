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

    // Handle different platforms based on the transaction platform
    const platform = transaction.platform as "ethereum" | "polkadot" | "solana"

    if (platform === "ethereum") {
      return {
        platform: "ethereum" as const,
        networkId: token.networkId as `0x${string}`,
        payload: transaction.tx as import("viem").TransactionRequest,
      }
    } else if (platform === "polkadot") {
      return {
        platform: "polkadot" as const,
        payload: transaction.tx as import("extension-core").SignerPayloadJSON,
        txMetadata: (transaction.txDetails as { shortMetadata?: Uint8Array | `0x${string}` })
          ?.shortMetadata,
      }
    } else if (platform === "solana") {
      return {
        platform: "solana" as const,
        networkId: token.networkId as `0x${string}`,
        payload: transaction.tx as
          | import("@solana/web3.js").Transaction
          | import("@solana/web3.js").VersionedTransaction,
      }
    }

    return null
  }, [account, token, product, deposit, transaction])

  // Use Yield.xyz submit button if we have a yield transaction
  if (transaction?.isYieldTransaction) {
    return (
      <YieldSubmitButton
        label={isSubmitting ? t("Depositing...") : t("Deposit")}
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
  onTxSubmitted?: (data: { networkId: string; txId: string }) => void
  account: string
  tokenId: string
  productId: string
}

const ConfirmDepositModalContent = ({
  onClose,
  onTxSubmitted: _onTxSubmitted,
  account,
  tokenId,
  productId,
}: Omit<ConfirmDepositModalProps, "isOpen">) => {
  const [currentStep, setCurrentStep] = useState<"confirm" | "progress">("confirm")
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

  const handleClose = () => {
    setCurrentStep("confirm")
    resetUserInput()
    onClose()
  }

  // For progress step, render a clean full-screen view like SendFunds
  if (currentStep === "progress" && progress) {
    return (
      <div
        className={classNames(
          "relative h-full w-full bg-black px-12 py-8",
          !IS_POPUP && "border-grey-800 rounded border",
        )}
      >
        <SendFundsProgress
          networkId={progress.networkId}
          txId={progress.txId}
          onClose={handleClose}
        />
      </div>
    )
  }

  // Normal modal layout for confirm step
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
              <div className="flex flex-col gap-32">
                <DepositProgressBar
                  currentStep={transactionStep}
                  tokenSymbol={token?.symbol || "Token"}
                />
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
                onTxSubmitted={({ networkId, txId }: { networkId: string; txId: string }) => {
                  // Update progress bar to show step 2 (green) when last transaction starts
                  setTransactionStep(2)
                  // Direct flow - close modal and show progress
                  setProgress({ networkId, txId })
                  setCurrentStep("progress")
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const ConfirmDepositModal = ({
  isOpen,
  onClose,
  onTxSubmitted,
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
            onTxSubmitted={onTxSubmitted}
            account={account}
            tokenId={tokenId}
            productId={productId}
          />
        </DepositWizardProvider>
      </Suspense>
    </Modal>
  )
}
