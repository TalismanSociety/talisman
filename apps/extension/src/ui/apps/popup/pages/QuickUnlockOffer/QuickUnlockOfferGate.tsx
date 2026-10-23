import { bind } from "@react-rxjs/core"
import { useAppState } from "@ui/state/app"
import { useOpenedLocked } from "@ui/state/isLoggedIn"
import { useQuickUnlockEnrolment } from "@ui/state/quickUnlock"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { IS_EMBEDDED_POPUP } from "@ui/util/constants"
import { isQuickUnlockAvailable } from "@ui/util/webauthnPrf"
import { type ReactNode, Suspense, useCallback, useEffect, useLayoutEffect, useState } from "react"
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

type Settled = Exclude<Decision, "pending">

export const QuickUnlockOfferGate = ({ children }: { children: ReactNode }) => {
  const [settled, setSettled] = useState<Settled | null>(null)

  // the first decision holds for the life of the popup. an offer stays until the user answers it,
  // as enrolling flips `enrolled` before the offer has reported the enrolment. a skip never turns
  // into an offer later, which would swap out whatever route the user is on by then
  const settle = useCallback((decision: Settled) => setSettled((prev) => prev ?? decision), [])

  // some inputs never answer on broken setups (authenticator probe, storage reads), and the user
  // must not wait on them after login. the timer lives above the suspending inputs so it always runs
  useEffect(() => {
    const timer = setTimeout(() => settle("skip"), OFFER_DECISION_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [settle])

  const answer = useCallback(() => setSettled("skip"), [])

  if (settled === "skip") return children

  return (
    <Suspense fallback={<QuickUnlockOfferBackdrop />}>
      {settled === "offer" ? (
        <QuickUnlockOffer onAnswer={answer} />
      ) : (
        <QuickUnlockOfferDecision onSettle={settle} />
      )}
    </Suspense>
  )
}

const QuickUnlockOfferDecision = ({ onSettle }: { onSettle: (decision: Settled) => void }) => {
  const available = useQuickUnlockAvailable()
  const enrolled = useQuickUnlockEnrolment()
  const isFeatureEnabled = useFeatureFlag("QUICK_UNLOCK")
  const [dismissedForGood] = useAppState("hideQuickUnlockOffer")

  const decision = decide({
    dismissedForGood: !!dismissedForGood,
    isFeatureEnabled,
    enrolled,
    available,
  })

  // settles before paint, so a decision known at login never flashes the backdrop
  useLayoutEffect(() => {
    if (decision !== "pending") onSettle(decision)
  }, [decision, onSettle])

  return <QuickUnlockOfferBackdrop />
}
