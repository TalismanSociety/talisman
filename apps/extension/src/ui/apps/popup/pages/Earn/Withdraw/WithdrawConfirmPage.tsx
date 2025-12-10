import { BalanceDto } from "extension-core"
import { FC, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { DepositProgressBar } from "@ui/domains/Earn/components/DepositProgressBar"
import { WithdrawDetails } from "@ui/domains/Earn/components/WithdrawDetails"
import {
  useWithdrawFundsContext,
  WithdrawFundsProvider,
} from "@ui/domains/Earn/components/WithdrawFundsProvider"
import { WithdrawSubmitButton } from "@ui/domains/Earn/components/WithdrawSubmitButton"
import {
  useWithdrawWizard,
  WithdrawWizardProvider,
} from "@ui/domains/Earn/context/WithdrawWizardContext"
import { useYieldxyzPosition } from "@ui/domains/Earn/hooks/useYieldxyzPosition"

const WithdrawConfirmPageInner: FC<{
  balance: BalanceDto | undefined
  onTransactionError: (error: Error) => void
  onTransactionSubmitted: (params: { networkId: string; txId: string }) => void
}> = ({ balance, onTransactionError, onTransactionSubmitted }) => {
  const { t } = useTranslation()
  const { token } = useWithdrawFundsContext()

  return (
    <>
      <div className="flex flex-col gap-16 px-10 pb-4">
        <div className="text-body text-center text-lg font-bold">{t("You're withdrawing")}</div>
        <div className="flex flex-col gap-32">
          <DepositProgressBar
            currentStep={1}
            tokenSymbol={balance?.token.symbol || token?.symbol || "Token"}
            labels={["Prepare", "Withdraw"]}
          />
          <WithdrawDetails />
        </div>
      </div>

      <div className="grow overflow-hidden pt-0">
        <div className="flex h-full w-full flex-col px-12 pb-8">
          <div className="mt-auto">
            <WithdrawSubmitButton
              onError={onTransactionError}
              onTxSubmitted={onTransactionSubmitted}
            />
          </div>
        </div>
      </div>
    </>
  )
}

const WithdrawConfirmPageContent: FC = () => {
  const { t } = useTranslation()
  const { set, setBalance, goto, gotoProgress } = useWithdrawWizard()
  const [searchParams] = useSearchParams()

  const yieldId = searchParams.get("yieldId")
  const account = searchParams.get("account")
  const tokenId = searchParams.get("tokenId")
  const validatorAddress = searchParams.get("validatorAddress")
  const amount = searchParams.get("amount")

  // Get the position data to find the balance
  const position = useYieldxyzPosition(yieldId || undefined)
  const balance = position?.balances.find(
    (b: BalanceDto) => b.address === account && (b.token.address || b.token.symbol) === tokenId,
  )

  // Initialize the wizard with the provided parameters
  useEffect(() => {
    if (account && yieldId && tokenId && balance) {
      set("account", account)
      set("yieldId", yieldId)
      set("tokenId", tokenId)
      setBalance(balance)
      if (amount) set("amount", amount)
      if (validatorAddress) {
        set("validatorAddress", validatorAddress)
      }
    }
  }, [account, yieldId, tokenId, validatorAddress, amount, balance, set, setBalance])

  const handleTransactionError = (_error: Error) => {
    // Could show error state or go back to confirm
    // For now, just log the error
  }

  const handleClose = () => {
    // Navigate back to withdraw amount page with all preserved parameters (including amount)
    goto("amount")
  }

  const handleTransactionSubmitted = ({ networkId, txId }: { networkId: string; txId: string }) => {
    gotoProgress({ networkId, txId })
  }

  return (
    <div className="flex size-full flex-grow flex-col bg-black">
      <div className="flex w-full items-center justify-center gap-8 overflow-hidden p-10">
        <div className="text-base font-bold text-white">{t("Withdraw")}</div>
        <button
          type="button"
          onClick={handleClose}
          className="text-body-secondary hover:text-body absolute right-10 text-xl"
        >
          ×
        </button>
      </div>

      <WithdrawFundsProvider>
        <WithdrawConfirmPageInner
          balance={balance}
          onTransactionError={handleTransactionError}
          onTransactionSubmitted={handleTransactionSubmitted}
        />
      </WithdrawFundsProvider>
    </div>
  )
}

export const WithdrawConfirmPage: FC = () => {
  return (
    <WithdrawWizardProvider>
      <WithdrawConfirmPageContent />
    </WithdrawWizardProvider>
  )
}
