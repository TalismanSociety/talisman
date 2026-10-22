import { useAppState } from "@ui/state/app"
import { useQuickUnlockEnrolment } from "@ui/state/quickUnlock"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { IS_EMBEDDED_POPUP } from "@ui/util/constants"
import { isQuickUnlockAvailable } from "@ui/util/webauthnPrf"
import { useCallback, useEffect, useState } from "react"

export type QuickUnlockOfferDecision = "pending" | "offer" | "skip"

type OfferStage = "deciding" | "offering" | "answered"

type OfferState = {
  stage: OfferStage
  isEmbeddedPopup: boolean
  openedLocked: boolean
  isLoggedIn: boolean
  dismissedForGood: boolean
  isFeatureEnabled: boolean
  enrolled: boolean | null
  available: boolean | null
}

const decide = (state: OfferState): QuickUnlockOfferDecision => {
  if (state.stage === "answered" || !state.isLoggedIn) return "skip"
  if (state.stage === "offering") return "offer"
  if (
    !state.isEmbeddedPopup ||
    !state.openedLocked ||
    state.dismissedForGood ||
    !state.isFeatureEnabled ||
    state.enrolled
  )
    return "skip"
  if (state.enrolled === null || state.available === null) return "pending"
  return state.available ? "offer" : "skip"
}

/**
 * Whether to offer quick unlock to a user who just typed their password in the toolbar popup.
 * Popup windows opened for a dapp request never offer it, the user is there for the request.
 */
export const useQuickUnlockOffer = (isLoggedIn: boolean) => {
  const [openedLocked] = useState(!isLoggedIn)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [stage, setStage] = useState<OfferStage>("deciding")
  const enrolled = useQuickUnlockEnrolment()
  const isFeatureEnabled = useFeatureFlag("QUICK_UNLOCK")
  const [dismissedForGood] = useAppState("hideQuickUnlockOffer")

  // started on open, so it has resolved by the time the user has typed their password
  useEffect(() => {
    if (IS_EMBEDDED_POPUP && openedLocked) isQuickUnlockAvailable().then(setAvailable)
  }, [openedLocked])

  const decision = decide({
    stage,
    isEmbeddedPopup: IS_EMBEDDED_POPUP,
    openedLocked,
    isLoggedIn,
    dismissedForGood: !!dismissedForGood,
    isFeatureEnabled,
    enrolled,
    available,
  })

  // once on screen, the offer stays until the user answers it: enrolling flips `enrolled` before
  // the offer has reported the enrolment, and unmounting it then would abandon the setup flow
  useEffect(() => {
    if (decision === "offer" && stage === "deciding") setStage("offering")
  }, [decision, stage])

  const answer = useCallback(() => setStage("answered"), [])

  return { decision, answer }
}
