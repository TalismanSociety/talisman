import { ZapFastIcon } from "@talismn/icons"
import { FormEvent, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useWithdrawWizard } from "../../context/WithdrawWizardContext"
import { useWithdrawFundsContext, WithdrawFundsProvider } from "../WithdrawFundsProvider"
import { AddressPillButton } from "./AddressPillButton"
import { AmountEdit } from "./AmountEdit"
import { AssetRow } from "./AssetRow"
import { Container } from "./Container"
import { FeesSummary } from "./FeesSummary"
import { NetworkRow } from "./NetworkRow"
import { ProductSummary } from "./ProductSummary"
import { ValidationErrors } from "./ValidationErrors"

const ReviewButton = ({ onNext }: { onNext?: () => void }) => {
  const { t } = useTranslation()
  const { gotoConfirm } = useWithdrawWizard()
  const { isValid, isLoading } = useWithdrawFundsContext()

  const handleConfirm = useCallback(() => {
    if (isValid && !isLoading) {
      if (onNext) {
        onNext()
      } else {
        gotoConfirm()
      }
    }
  }, [isValid, isLoading, gotoConfirm, onNext])

  return (
    <Button
      type="submit"
      primary
      className="mt-8 w-full"
      disabled={!isValid || isLoading}
      data-testid="component-review-button"
      onClick={handleConfirm}
    >
      {isLoading ? (
        t("Validating...")
      ) : (
        <span className="inline-flex items-center gap-2">
          <ZapFastIcon className="h-8 w-8" />
          {t("Review")}
        </span>
      )}
    </Button>
  )
}

interface WithdrawAmountFormProps {
  onNext?: () => void
}

export const WithdrawAmountForm = ({ onNext }: WithdrawAmountFormProps) => {
  const { account, balance } = useWithdrawWizard()

  // we use a form for enter keypress to trigger submit button, but we don't want form to be actually submitted
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return (
    <WithdrawFundsProvider>
      <form
        onSubmit={handleSubmit}
        className="flex h-full w-full flex-col justify-between overflow-hidden px-12 pb-8"
      >
        <div className="flex flex-col gap-16">
          {/* Section 1: Asset and Account Info */}
          <Container className="space-y-4 px-8 py-4">
            <AssetRow />
            <div className="flex w-full items-center justify-between gap-4">
              <div className="text-grey-400">Account</div>
              <AddressPillButton address={account} onClick={() => {}} />
            </div>
          </Container>

          {/* Section 2: Balance/Amount Component (centered) */}
          <div className="flex flex-col items-center justify-center">
            <AmountEdit key={`${balance?.address || ""}-${balance?.token?.address || ""}`} />
            <ValidationErrors />
          </div>

          {/* Section 3: Network, Priority, and Fees */}
          <Container className="space-y-4 px-8 py-4">
            <NetworkRow />
            <ProductSummary />
            <FeesSummary />
          </Container>
        </div>

        <ReviewButton onNext={onNext} />
      </form>
    </WithdrawFundsProvider>
  )
}
