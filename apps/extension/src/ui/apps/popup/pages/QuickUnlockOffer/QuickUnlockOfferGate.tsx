import { useAppState } from "@ui/state/app"
import { useQuickUnlockEnrolment } from "@ui/state/quickUnlock"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { IS_EMBEDDED_POPUP } from "@ui/util/constants"
import { isQuickUnlockAvailable } from "@ui/util/webauthnPrf"
import { type ReactNode, useCallback, useEffect, useState } from "react"

import { QuickUnlockOffer } from "./QuickUnlockOffer"

type OfferStage = "deciding" | "offering" | "answered"

type OfferState = {
  stage: OfferStage
  dismissedForGood: boolean
  isFeatureEnabled: boolean
  enrolled: boolean | null
  available: boolean | null
}

const decide = (state: OfferState): "pending" | "offer" | "skip" => {
  if (state.stage === "answered") return "skip"
  if (state.stage === "offering") return "offer"
  if (state.dismissedForGood || !state.isFeatureEnabled || state.enrolled) return "skip"
  if (state.enrolled === null || state.available === null) return "pending"
  return state.available ? "offer" : "skip"
}

/**
 * Whether this popup may offer quick unlock to a user who is about to type their password.
 * Popup windows opened for a dapp request never offer it, the user is there for the request.
 */
export const useCanOfferQuickUnlock = (isLoggedIn: boolean) => {
  const [canOffer] = useState(IS_EMBEDDED_POPUP && !isLoggedIn)
  return canOffer
}

export const QuickUnlockOfferGate = ({ children }: { children: ReactNode }) => {
  const [stage, setStage] = useState<OfferStage>("deciding")
  const [available, setAvailable] = useState<boolean | null>(null)
  const enrolled = useQuickUnlockEnrolment()
  const isFeatureEnabled = useFeatureFlag("QUICK_UNLOCK")
  const [dismissedForGood] = useAppState("hideQuickUnlockOffer")

  useEffect(() => {
    isQuickUnlockAvailable().then(setAvailable)
  }, [])

  const decision = decide({
    stage,
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

  if (decision === "pending") return null
  if (decision === "offer") return <QuickUnlockOffer onAnswer={answer} />
  return children
}
