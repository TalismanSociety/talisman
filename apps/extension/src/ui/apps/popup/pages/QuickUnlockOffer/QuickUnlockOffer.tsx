import { UserCheckIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { DrawerContent } from "@ui/components/DrawerContent"
import { notify } from "@ui/components/Notifications"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { useVirtualScreen } from "@ui/hooks/analytics/screens"
import { useEnableQuickUnlock } from "@ui/hooks/useEnableQuickUnlock"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAppState } from "@ui/state/app"
import { HandMonoLogo } from "@ui/theme/logos"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { PopupContent, PopupLayout } from "../../Layout/PopupLayout"
import { LoginScreenBackground } from "../Login"

export const QuickUnlockOffer = ({ onAnswer }: { onAnswer: () => void }) => {
  const { t } = useTranslation()
  useVirtualScreen("/quick-unlock-offer")
  const [, setHideOffer] = useAppState("hideQuickUnlockOffer")
  const enableQuickUnlock = useEnableQuickUnlock()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const abortRef = useRef<AbortController>(null)

  // opened after mount, so the drawer finds the layout it slides up from
  const { isOpen, open } = useOpenClose()
  useEffect(open, [open])

  useEffect(() => {
    // pagehide covers the popup being torn down, where react never gets to run the unmount cleanup
    const abort = () => abortRef.current?.abort()
    window.addEventListener("pagehide", abort)
    return () => {
      window.removeEventListener("pagehide", abort)
      abort()
    }
  }, [])

  const handleDecline = useCallback(() => {
    setHideOffer(true)
    onAnswer()
  }, [onAnswer, setHideOffer])

  const handleEnable = useCallback(async () => {
    setProcessing(true)
    setError(undefined)
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    try {
      const result = await enableQuickUnlock(abort.signal)
      switch (result.status) {
        case "enabled":
          notify({ type: "success", title: t("Quick unlock is on") })
          onAnswer()
          break
        case "failed":
          setError(result.message)
          break
        case "cancelled":
          break
      }
    } finally {
      setProcessing(false)
    }
  }, [enableQuickUnlock, onAnswer, t])

  return (
    <PopupLayout>
      <Suspense fallback={<SuspenseTracker name="Background" />}>
        <LoginScreenBackground />
      </Suspense>
      <PopupContent className="z-10 select-none pt-32 text-center">
        <div className="mt-[60px]">
          <HandMonoLogo className="inline-block text-[64px]" />
        </div>
      </PopupContent>
      <Drawer
        analyticsId="quick_unlock_offer"
        containerId="main"
        isOpen={isOpen}
        anchor="bottom"
        onDismiss={processing ? undefined : onAnswer}
      >
        <DrawerContent className="flex flex-col items-center gap-12 text-center">
          <div className="flex size-28 items-center justify-center rounded-full bg-primary/10 text-primary text-xl">
            <UserCheckIcon />
          </div>
          <div className="flex flex-col gap-4">
            <p className="font-bold text-white">{t("Unlock faster next time")}</p>
            <p className="text-body-secondary text-sm">
              {t(
                "Use Touch ID, Windows Hello or your device's screen lock instead of typing your password. Your password still works."
              )}
            </p>
            {error && <p className="text-alert-warn text-sm">{error}</p>}
          </div>
          <div className="flex w-full flex-col items-center gap-6">
            <div className="grid w-full grid-cols-2 gap-8">
              <Button disabled={processing} onClick={handleDecline}>
                {t("No thanks")}
              </Button>
              <Button primary processing={processing} onClick={handleEnable}>
                {t("Turn on")}
              </Button>
            </div>
            <p className="text-body-disabled text-xs">
              {t("You can change this anytime in Settings.")}
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </PopupLayout>
  )
}
