import { bind } from "@react-rxjs/core"
import { useAppState } from "@ui/state/app"
import { useOpenedLocked } from "@ui/state/isLoggedIn"
import { useQuickUnlockEnrolment } from "@ui/state/quickUnlock"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { IS_EMBEDDED_POPUP } from "@ui/util/constants"
import { isQuickUnlockAvailable } from "@ui/util/webauthnPrf"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import { defer, shareReplay } from "rxjs"

import { QuickUnlockOffer } from "./QuickUnlockOffer"
import { QuickUnlockOfferBackdrop } from "./QuickUnlockOfferBackdrop"

type Decision = "pending" | "offer" | "skip"

type OfferInputs = {
  dismissedForGood: boolean
  isFeatureEnabled: boolean
  enrolled: boolean | null
  available: boolean | null
}

const decide = (inputs: OfferInputs): Decision => {
  if (
    inputs.dismissedForGood ||
    !inputs.isFeatureEnabled ||
    inputs.enrolled ||
    inputs.available === false
  )
    return "skip"
  if (inputs.enrolled === null || inputs.available === null) return "pending"
  return "offer"
}

export const OFFER_DECISION_TIMEOUT_MS = 1_500

// slow on some platforms (Windows Hello), so it starts while the user types their password
const quickUnlockAvailable$ = defer(isQuickUnlockAvailable).pipe(shareReplay(1))
const [useQuickUnlockAvailable] = bind(quickUnlockAvailable$, null)

/**
 * Whether this popup may offer quick unlock to a user who is about to type their password.
 * Popup windows opened for a dapp request never offer it, the user is there for the request.
 */
export const useCanOfferQuickUnlock = () => {
  const openedLocked = useOpenedLocked()
  const canOffer = IS_EMBEDDED_POPUP && openedLocked === true

  useEffect(() => {
    if (canOffer) quickUnlockAvailable$.subscribe()
  }, [canOffer])

  return canOffer
}

export const QuickUnlockOfferGate = ({ children }: { children: ReactNode }) => {
  const [settled, setSettled] = useState<Exclude<Decision, "pending"> | null>(null)
  const available = useQuickUnlockAvailable()
  const enrolled = useQuickUnlockEnrolment()
  const isFeatureEnabled = useFeatureFlag("QUICK_UNLOCK")
  const [dismissedForGood] = useAppState("hideQuickUnlockOffer")
  const [timedOut, setTimedOut] = useState(false)

  // some broken authenticator setups never answer, and the user must not wait on them after login
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), OFFER_DECISION_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  const inputsDecision = decide({
    dismissedForGood: !!dismissedForGood,
    isFeatureEnabled,
    enrolled,
    available,
  })
  const decision = settled ?? (inputsDecision === "pending" && timedOut ? "skip" : inputsDecision)

  // the first decision holds for the life of the popup. an offer stays until the user answers it,
  // as enrolling flips `enrolled` before the offer has reported the enrolment. a skip never turns
  // into an offer later, which would swap out whatever route the user is on by then
  useEffect(() => {
    if (!settled && decision !== "pending") setSettled(decision)
  }, [settled, decision])

  const answer = useCallback(() => setSettled("skip"), [])

  if (decision === "pending") return <QuickUnlockOfferBackdrop />
  if (decision === "offer") return <QuickUnlockOffer onAnswer={answer} />
  return children
}
