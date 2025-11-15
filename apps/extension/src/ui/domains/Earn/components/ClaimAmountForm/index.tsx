import { ZapFastIcon } from "@talismn/icons"
import { FormEvent, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ClaimWizardPage, useClaimWizard } from "../../context/ClaimWizardContext"
import { useClaim } from "../useClaim"
import { AddressPillButton } from "./AddressPillButton"
import { ClaimableAmountRow } from "./ClaimableAmountRow"
import { Container } from "./Container"
import { FeesSummary } from "./FeesSummary"
import { ProductSummary } from "./ProductSummary"
import { ValidationErrors } from "./ValidationErrors"

const ClaimButton = ({ onNext }: { onNext?: () => void }) => {
  const { t } = useTranslation()
  const { gotoConfirm } = useClaimWizard()
  const { isValid, isLoading } = useClaim()

  const handleClaim = useCallback(() => {
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
      data-testid="component-claim-button"
      onClick={handleClaim}
    >
      {isLoading ? (
        t("Validating...")
      ) : (
        <span className="inline-flex items-center gap-2">
          <ZapFastIcon className="h-8 w-8" />
          {t("Claim")}
        </span>
      )}
    </Button>
  )
}

interface ClaimAmountFormProps {
  onNext?: () => void
}

export const ClaimAmountForm = ({ onNext }: ClaimAmountFormProps) => {
  const { t } = useTranslation()
  const { account, goto } = useClaimWizard()

  const handleGotoClick = useCallback(
    (page: ClaimWizardPage) => () => {
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
    <form
      onSubmit={handleSubmit}
      className="flex h-full w-full flex-col justify-between overflow-hidden px-12 pb-8"
    >
      <div className="flex flex-col gap-20">
        <Container className="flex h-24 w-full items-center justify-between gap-4 p-8">
          <div className="text-grey-400 text-sm">{t("Account")}</div>
          <div>
            <AddressPillButton
              className="!w-full"
              address={account}
              onClick={handleGotoClick("claim")}
            />
          </div>
        </Container>
        {/* Single consolidated validation/errors area */}
        <div className="flex flex-col gap-0">
          <div className="flex justify-center px-8 py-2">
            <div className="flex w-full flex-col items-center gap-3">
              <ValidationErrors />
            </div>
          </div>
          <div className="w-full space-y-4 text-xs leading-[140%]">
            <ClaimableAmountRow />
            <ProductSummary />
            <FeesSummary />
          </div>
        </div>
      </div>
      <ClaimButton onNext={onNext} />
    </form>
  )
}
