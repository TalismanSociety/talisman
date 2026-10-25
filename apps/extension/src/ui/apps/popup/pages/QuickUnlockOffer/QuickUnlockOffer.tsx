import { FingerprintIcon, XIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { DrawerContent } from "@ui/components/DrawerContent"
import { IconButton } from "@ui/components/IconButton"
import { notify } from "@ui/components/Notifications"
import { type InlineError, useErrorShown } from "@ui/hooks/analytics/errorShown"
import { useVirtualScreen } from "@ui/hooks/analytics/screens"
import { useEnableQuickUnlock } from "@ui/hooks/useEnableQuickUnlock"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAppState } from "@ui/state/app"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { QuickUnlockOfferBackdrop } from "./QuickUnlockOfferBackdrop"

export const QuickUnlockOffer = ({ onAnswer }: { onAnswer: () => void }) => {
  const { t } = useTranslation()
  useVirtualScreen("/quick-unlock-offer")
  const [, setHideOffer] = useAppState("hideQuickUnlockOffer")
  const enableQuickUnlock = useEnableQuickUnlock()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<InlineError>()
  useErrorShown({ shown: error?.message, surface: "field", category: error?.category ?? "unknown" })
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
          setError(result)
          break
        case "cancelled":
          break
      }
    } finally {
      setProcessing(false)
    }
  }, [enableQuickUnlock, onAnswer, t])

  return (
    <QuickUnlockOfferBackdrop>
      <Drawer
        analyticsId="quick_unlock_offer"
        containerId="main"
        isOpen={isOpen}
        anchor="bottom"
        onDismiss={processing ? undefined : onAnswer}
      >
        <DrawerContent className="flex flex-col items-center gap-12 text-center">
          <IconButton
            className="absolute top-12 right-12"
            aria-label={t("Close")}
            disabled={processing}
            onClick={onAnswer}
          >
            <XIcon />
          </IconButton>
          <div className="flex size-28 items-center justify-center rounded-full bg-primary/10 text-primary text-xl">
            <FingerprintIcon />
          </div>
          <div className="flex flex-col gap-4">
            <p className="font-bold text-white">{t("Unlock Talisman Faster")}</p>
            <p className="text-body-secondary text-sm">
              {t(
                "Unlock Talisman with Touch ID, Windows Hello or your device's screen lock. Your password still works."
              )}
            </p>
            <p className="text-body-disabled text-sm">{t("Manage this anytime in Settings.")}</p>
            {error && <p className="text-alert-warn text-sm">{error.message}</p>}
          </div>
          <div className="grid w-full grid-cols-2 gap-8">
            <Button disabled={processing} onClick={handleDecline}>
              {t("No thanks")}
            </Button>
            <Button primary processing={processing} onClick={handleEnable}>
              {t("Enable")}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </QuickUnlockOfferBackdrop>
  )
}
