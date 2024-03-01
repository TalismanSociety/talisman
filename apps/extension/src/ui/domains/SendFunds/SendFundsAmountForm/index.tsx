import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { SendFundsWizardPage, useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { FormEvent, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ForfeitWarningDrawer } from "../Drawers/ForfeitWarningDrawer"
import { useGenesisHashFromTokenId } from "../useGenesisHashFromTokenId"
import { useSendFunds } from "../useSendFunds"
import { AddContact } from "./AddContact"
import { AddressPillButton } from "./AddressPillButton"
import { AmountEdit } from "./AmountEdit"
import { Container } from "./Container"
import { FeesSummary } from "./FeesSummary"
import { TokenRow } from "./TokenRow"

const ReviewButton = () => {
  const { t } = useTranslation("send-funds")
  const { gotoReview } = useSendFundsWizard()
  const { isValid, tokensToBeReaped } = useSendFunds()
  const forfeitDrawer = useGlobalOpenClose("sendFundsForfeitDrawer")

  const handleClick = useCallback(() => {
    if (tokensToBeReaped?.length) forfeitDrawer.open()
    else gotoReview(false)
  }, [tokensToBeReaped?.length, forfeitDrawer, gotoReview])

  return (
    <>
      <Button
        type="submit"
        primary
        className="mt-8 w-full"
        disabled={!isValid}
        onClick={handleClick}
      >
        {t("Review")}
      </Button>
      <ForfeitWarningDrawer isOpen={forfeitDrawer.isOpen} close={forfeitDrawer.close} />
    </>
  )
}

export const SendFundsAmountForm = () => {
  const { t } = useTranslation("send-funds")
  const { from, to, goto, tokenId } = useSendFundsWizard()
  const genesisHash = useGenesisHashFromTokenId(tokenId)

  const handleGotoClick = useCallback(
    (page: SendFundsWizardPage) => () => {
      goto(page)
    },
    [goto]
  )

  // we use a form for enter keypress to trigger submit button, but we don't want form to be actually submitted
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full w-full flex-col overflow-hidden px-12 pb-8"
    >
      <Container className="flex h-[9rem] w-full flex-col justify-center gap-5 px-8">
        <div className="flex w-full items-center justify-between gap-4">
          <div>{t("From")}</div>
          <div>
            <AddressPillButton
              className="!max-w-[260px]"
              address={from}
              genesisHash={genesisHash}
              onClick={handleGotoClick("from")}
            />
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <div>{t("To")}</div>
          <div className="flex items-center gap-4">
            <AddressPillButton
              className="!max-w-[260px]"
              address={to}
              genesisHash={genesisHash}
              onClick={handleGotoClick("to")}
            />
            <AddContact />
          </div>
        </div>
      </Container>
      <AmountEdit />
      <div className="w-full space-y-4 text-xs leading-[140%]">
        <TokenRow onEditClick={handleGotoClick("token")} />
        <FeesSummary />
      </div>
      <ReviewButton />
    </form>
  )
}
