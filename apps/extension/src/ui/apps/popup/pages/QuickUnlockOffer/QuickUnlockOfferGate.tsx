import { useAppState } from "@ui/state/app"
import { useOpenedLocked } from "@ui/state/isLoggedIn"
import { useQuickUnlockEnrolment } from "@ui/state/quickUnlock"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { IS_EMBEDDED_POPUP } from "@ui/util/constants"
import { isQuickUnlockAvailable } from "@ui/util/webauthnPrf"
import { type ReactNode, useCallback, useEffect, useState } from "react"

import { QuickUnlockOffer } from "./QuickUnlockOffer"

type Decision = "pending" | "offer" | "skip"

type OfferInputs = {
  dismissedForGood: boolean
  isFeatureEnabled: boolean
  enrolled: boolean | null
  available: boolean | null
}

const decide = (inputs: OfferInputs): Decision => {
  if (inputs.dismissedForGood || !inputs.isFeatureEnabled || inputs.enrolled) return "skip"
  if (inputs.enrolled === null || inputs.available === null) return "pending"
  return inputs.available ? "offer" : "skip"
}

/**
 * Whether this popup may offer quick unlock to a user who is about to type their password.
 * Popup windows opened for a dapp request never offer it, the user is there for the request.
 */
export const useCanOfferQuickUnlock = () => {
  const openedLocked = useOpenedLocked()
  return IS_EMBEDDED_POPUP && openedLocked === true
}

export const QuickUnlockOfferGate = ({ children }: { children: ReactNode }) => {
  const [settled, setSettled] = useState<Exclude<Decision, "pending"> | null>(null)
  const [available, setAvailable] = useState<boolean | null>(null)
  const enrolled = useQuickUnlockEnrolment()
  const isFeatureEnabled = useFeatureFlag("QUICK_UNLOCK")
  const [dismissedForGood] = useAppState("hideQuickUnlockOffer")

  useEffect(() => {
    isQuickUnlockAvailable().then(setAvailable)
  }, [])

  const decision =
    settled ??
    decide({ dismissedForGood: !!dismissedForGood, isFeatureEnabled, enrolled, available })

  // the first decision holds for the life of the popup. an offer stays until the user answers it,
  // as enrolling flips `enrolled` before the offer has reported the enrolment. a skip never turns
  // into an offer later, which would swap out whatever route the user is on by then
  useEffect(() => {
    if (!settled && decision !== "pending") setSettled(decision)
  }, [settled, decision])

  const answer = useCallback(() => setSettled("skip"), [])

  if (decision === "pending") return null
  if (decision === "offer") return <QuickUnlockOffer onAnswer={answer} />
  return children
}
