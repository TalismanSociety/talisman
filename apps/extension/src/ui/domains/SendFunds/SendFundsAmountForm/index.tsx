import {
  type SendFundsWizardPage,
  useSendFundsWizard,
} from "@ui/apps/popup/pages/SendFunds/context"
import { Button } from "@ui/components/Button"
import { useGlobalOpenClose } from "@ui/hooks/useGlobalOpenClose"
import { type FormEvent, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { ConvictionLockSendWarningDrawer } from "../Drawers/ConvictionLockSendWarningDrawer"
import { ForfeitWarningDrawer } from "../Drawers/ForfeitWarningDrawer"
import { RecipientWarningDrawer } from "../Drawers/RecipientWarningDrawer"
import { RootStakedTaoWarningDrawer } from "../Drawers/RootStakedTaoWarningDrawer"
import { useGenesisHashFromTokenId } from "../useGenesisHashFromTokenId"
import { useSendFunds } from "../useSendFunds"
import { AddContact } from "./AddContact"
import { AddressPillButton } from "./AddressPillButton"
import { AmountEdit } from "./AmountEdit"
import { AvailableBalanceRow } from "./AvailableBalanceRow"
import { Container } from "./Container"
import { FeesSummary } from "./FeesSummary"

const ReviewButton = () => {
  const { t } = useTranslation()
  const { gotoReview } = useSendFundsWizard()
  const { isValid, tokensToBeReaped, recipientWarning, token, dtaoLockedTransferWarning } =
    useSendFunds()
  const forfeitDrawer = useGlobalOpenClose("sendFundsForfeitDrawer")
  const recipientWarningDrawer = useGlobalOpenClose("sendFundsRecipientWarningDrawer")
  const rootStakedTaoDrawer = useGlobalOpenClose("sendFundsRootStakedTaoWarningDrawer")
  const convictionLockDrawer = useGlobalOpenClose("sendFundsConvictionLockWarningDrawer")
  const [warnings, setWarnings] = useState<string[]>([])
  const [acceptedWarnings, setAcceptedWarnings] = useState<string[]>([])
  const [confirmed, setConfirmed] = useState(false)

  const isRootStakedTao = token?.type === "substrate-dtao" && token.netuid === 0

  useEffect(() => {
    if (isRootStakedTao)
      setWarnings((prev) => Array.from(new Set([...prev, "rootStakedTaoWarning"])))
    if (!isRootStakedTao) setWarnings((prev) => prev.filter((w) => w !== "rootStakedTaoWarning"))

    if (dtaoLockedTransferWarning)
      setWarnings((prev) => Array.from(new Set([...prev, "convictionLockWarning"])))
    if (!dtaoLockedTransferWarning)
      setWarnings((prev) => prev.filter((w) => w !== "convictionLockWarning"))

    if (recipientWarning) setWarnings((prev) => Array.from(new Set([...prev, "recipientWarning"])))
    if (!recipientWarning) setWarnings((prev) => prev.filter((w) => w !== "recipientWarning"))

    if (tokensToBeReaped?.length)
      setWarnings((prev) => Array.from(new Set([...prev, "forfeitWarning"])))
    if (!tokensToBeReaped?.length) setWarnings((prev) => prev.filter((w) => w !== "forfeitWarning"))
  }, [isRootStakedTao, dtaoLockedTransferWarning, recipientWarning, tokensToBeReaped])

  useEffect(() => {
    // once the confirmed state has been set, component will cycle through all warnings until all are accepted
    if (!confirmed) return

    if (
      warnings.includes("rootStakedTaoWarning") &&
      !acceptedWarnings.includes("rootStakedTaoWarning")
    )
      rootStakedTaoDrawer.open()
    else if (
      warnings.includes("convictionLockWarning") &&
      !acceptedWarnings.includes("convictionLockWarning")
    )
      convictionLockDrawer.open()
    else if (warnings.includes("forfeitWarning") && !acceptedWarnings.includes("forfeitWarning"))
      forfeitDrawer.open()
    else if (
      warnings.includes("recipientWarning") &&
      !acceptedWarnings.includes("recipientWarning")
    )
      recipientWarningDrawer.open()
    else gotoReview(acceptedWarnings.includes("forfeitWarning"))
  }, [
    confirmed,
    warnings,
    acceptedWarnings,
    rootStakedTaoDrawer,
    convictionLockDrawer,
    forfeitDrawer,
    recipientWarningDrawer,
    gotoReview,
  ])

  const handleAcceptWarning = useCallback((warning: string) => {
    setAcceptedWarnings((prev) => [...prev, warning])
  }, [])

  return (
    <>
      <Button
        type="submit"
        primary
        className="mt-8 w-full"
        disabled={!isValid}
        data-testid="component-review-button"
        onClick={() => setConfirmed(true)}
      >
        {t("Review")}
      </Button>
      <RootStakedTaoWarningDrawer
        isOpen={rootStakedTaoDrawer.isOpen}
        close={() => {
          setConfirmed(false)
          rootStakedTaoDrawer.close()
        }}
        handleAccept={() => {
          rootStakedTaoDrawer.close()
          handleAcceptWarning("rootStakedTaoWarning")
        }}
      />
      <ConvictionLockSendWarningDrawer
        isOpen={convictionLockDrawer.isOpen}
        close={() => {
          setConfirmed(false)
          convictionLockDrawer.close()
        }}
        handleAccept={() => {
          convictionLockDrawer.close()
          handleAcceptWarning("convictionLockWarning")
        }}
      />
      <ForfeitWarningDrawer
        isOpen={forfeitDrawer.isOpen}
        close={() => {
          setConfirmed(false)
          forfeitDrawer.close()
        }}
        handleAccept={() => {
          forfeitDrawer.close()
          handleAcceptWarning("forfeitWarning")
        }}
      />
      <RecipientWarningDrawer
        handleAccept={() => {
          recipientWarningDrawer.close()
          handleAcceptWarning("recipientWarning")
        }}
        isOpen={recipientWarningDrawer.isOpen}
        close={() => {
          setConfirmed(false)
          recipientWarningDrawer.close()
        }}
      />
    </>
  )
}

export const SendFundsAmountForm = () => {
  const { t } = useTranslation()
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
      <Container className="flex h-22.5 w-full flex-col justify-center gap-5 px-8">
        <div className="flex w-full items-center justify-between gap-4">
          <div>{t("From")}</div>
          <div>
            <AddressPillButton
              className="max-w-65!"
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
              className="max-w-65!"
              address={to}
              genesisHash={genesisHash}
              onClick={handleGotoClick("to")}
            />
            <AddContact tokenGenesisHash={genesisHash ?? undefined} />
          </div>
        </div>
      </Container>
      <AmountEdit onTokenClick={handleGotoClick("token")} />
      <div className="w-full space-y-4 text-xs leading-[140%]">
        <AvailableBalanceRow />
        <FeesSummary />
      </div>
      <ReviewButton />
    </form>
  )
}
