import { classNames } from "@talismn/util"
import { Suspense, useEffect } from "react"
import { Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"

import { DepositAmountForm } from "./components/DepositAmountForm"
import { DepositWizardProvider, useDepositWizard } from "./context/DepositWizardContext"

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  account: string
  tokenId: string
  productId: string
}

const DepositModalContent = ({
  onClose,
  onNext,
  account,
  tokenId,
  productId,
}: Omit<DepositModalProps, "isOpen">) => {
  const { set, resetUserInput } = useDepositWizard()

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
    resetUserInput()
    onClose()
  }

  return (
    <div
      id="deposit-modal-content"
      className={classNames(
        "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
        !IS_POPUP && "border-grey-800 rounded border",
      )}
    >
      <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
        <div className="text-base font-bold">Deposit</div>
        <button
          type="button"
          onClick={handleClose}
          className="text-body-secondary hover:text-body absolute right-10 text-xl"
        >
          ×
        </button>
      </div>

      <div className="grow overflow-hidden pt-0">
        <DepositAmountForm onNext={onNext} />
      </div>
    </div>
  )
}

export const DepositModal = ({
  isOpen,
  onClose,
  onNext,
  account,
  tokenId,
  productId,
}: DepositModalProps) => {
  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <Suspense fallback={<SuspenseTracker name="DepositModal" />}>
        <DepositWizardProvider>
          <DepositModalContent
            onClose={onClose}
            onNext={onNext}
            account={account}
            tokenId={tokenId}
            productId={productId}
          />
        </DepositWizardProvider>
      </Suspense>
    </Modal>
  )
}
