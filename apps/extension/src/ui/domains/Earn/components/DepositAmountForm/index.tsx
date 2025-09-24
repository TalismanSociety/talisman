import { ZapFastIcon } from "@talismn/icons"
import { FormEvent, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { DepositWizardPage, useDepositWizard } from "../../context/DepositWizardContext"
import { DepositProvider } from "../DepositProvider"
import { useDepositFunds } from "../useDepositFunds"
import { AddressPillButton } from "./AddressPillButton"
import { AmountEdit } from "./AmountEdit"
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
  const { account, goto } = useDepositWizard()

  const handleGotoClick = useCallback(
    (page: DepositWizardPage) => () => {
      goto(page)
    },
    [goto],
  )

  // we use a form for enter keypress to trigger submit button, but we don't want form to be actually submitted
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return (
    <DepositProvider>
      <form
        onSubmit={handleSubmit}
        className="flex h-full w-full flex-col overflow-hidden px-12 pb-8"
      >
        {/* Top-level notices */}
        <div className="mb-4 space-y-3 px-8">
          <InsufficientTokenNotice />
          <ValidationErrors />
        </div>
        <Container className="flex h-[9rem] w-full flex-col justify-center gap-5 px-8">
          <div className="flex w-full items-center justify-between gap-4">
            <div>{t("Account")}</div>
            <div>
              <AddressPillButton
                className="!max-w-[260px]"
                address={account}
                onClick={handleGotoClick("amount")}
              />
            </div>
          </div>
        </Container>
        <AmountEdit />
        <div className="w-full space-y-4 text-xs leading-[140%]">
          <AvailableBalanceRow />
          <ProductSummary />
          <FeesSummary />
        </div>
        <ReviewButton onNext={onNext} />
      </form>
    </DepositProvider>
  )
}
