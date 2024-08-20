import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Suspense, useCallback } from "react"
import { IconButton, Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"

import { InlineStakingFollowUp } from "./InlineStakingFollowUp"
import { InlineStakingForm } from "./InlineStakingForm"
import { InlineStakingReview } from "./InlineStakingReview"
import { useInlineStakingModal } from "./useInlineStakingModal"
import { useInlineStakingWizard } from "./useInlineStakingWizard"

const ModalHeader = () => {
  const { step, setStep } = useInlineStakingWizard()
  const { close } = useInlineStakingModal()

  const handleBackClick = useCallback(() => setStep("form"), [setStep])

  return (
    <div
      className={classNames(
        "text-body-secondary flex h-32 w-full shrink-0 items-center justify-between px-10",
        step === "follow-up" ? "invisible" : "visible"
      )}
    >
      <IconButton
        onClick={handleBackClick}
        className={classNames(step === "review" ? "block" : "hidden")}
      >
        <ChevronLeftIcon />
      </IconButton>
      <div>
        {step === "form" && <span className="text-body font-bold">Staking</span>}
        {step === "review" && "Confirm"}
      </div>
      <IconButton onClick={close}>
        <XIcon />
      </IconButton>
    </div>
  )
}

const ModalContent = () => {
  const { step } = useInlineStakingWizard()

  switch (step) {
    case "form":
      return <InlineStakingForm />
    case "review":
      return <InlineStakingReview />
    case "follow-up":
      return <InlineStakingFollowUp />
  }
}

const Content = () => (
  <div
    id="inlineStakingModalDialog" // acts as containerId for sub modals
    className={classNames(
      "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
      !IS_POPUP && "border-grey-850 rounded border"
    )}
  >
    <ModalHeader />
    <div className="grow p-12 pt-0">
      <ModalContent />
    </div>
  </div>
)

export const InlineStakingModal = () => {
  const { isOpen, close } = useInlineStakingModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <Suspense fallback={<SuspenseTracker name="InlineStakingModal" />}>
        <Content />
      </Suspense>
    </Modal>
  )
}
