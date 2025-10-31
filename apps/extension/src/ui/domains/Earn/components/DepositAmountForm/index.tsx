import { ZapFastIcon } from "@talismn/icons"
import { FormEvent, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useDepositWizard } from "../../context/DepositWizardContext"
import { DepositProvider } from "../DepositProvider"
import { useDepositFunds } from "../useDepositFunds"
import { AddressPillButton } from "./AddressPillButton"
import { AmountEdit, DepositAmountErrorMessage } from "./AmountEdit"
import { AvailableBalanceRow } from "./AvailableBalanceRow"
import { Container } from "./Container"
import { FeesSummary } from "./FeesSummary"
import { InsufficientTokenNotice } from "./InsufficientTokenNotice"
import { ProductSummary } from "./ProductSummary"
import { ValidationErrors } from "./ValidationErrors"

const ReviewButton = ({ onNext }: { onNext?: () => void }) => {
  const { t } = useTranslation()
  const { gotoConfirm } = useDepositWizard()
  const { isValid, isLoading } = useDepositFunds()

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

interface DepositAmountFormProps {
  onNext?: () => void
}

export const DepositAmountForm = ({ onNext }: DepositAmountFormProps) => {
  const { t } = useTranslation()
  const { account } = useDepositWizard()

  // we use a form for enter keypress to trigger submit button, but we don't want form to be actually submitted
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return (
    <DepositProvider>
      <form
        onSubmit={handleSubmit}
        className="flex h-full w-full flex-col justify-between overflow-hidden px-12 pb-8"
      >
        <div className="flex flex-col gap-20">
          <div className="flex flex-col gap-0">
            <Container className="flex h-[7rem] w-full flex-col justify-center px-8">
              <div className="flex w-full items-center justify-between gap-4">
                <div className="text-grey-400">{t("Account")}</div>
                <div>
                  <AddressPillButton className="!w-full" address={account} onClick={() => {}} />
                </div>
              </div>
            </Container>
            <AmountEdit />
          </div>
          {/* Single consolidated validation/errors area */}
          <div className="flex flex-col gap-0">
            <div className="flex justify-center px-8 py-2">
              <div className="flex w-full flex-col items-center gap-3">
                <DepositAmountErrorMessage />
                <InsufficientTokenNotice />
                <ValidationErrors />
              </div>
            </div>
            <div className="w-full space-y-4 text-xs leading-[140%]">
              <AvailableBalanceRow />
              <ProductSummary />
              <FeesSummary />
            </div>
          </div>
        </div>
        <ReviewButton onNext={onNext} />
      </form>
    </DepositProvider>
  )
}
