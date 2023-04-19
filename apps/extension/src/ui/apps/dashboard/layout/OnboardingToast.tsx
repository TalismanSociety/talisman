import { notifyCustom } from "@talisman/components/Notifications"
import { ExtensionButtonIcon, PinIcon } from "@talisman/theme/icons"
import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"

const OnboardNotification = () => (
  <div className="flex items-center gap-8 p-4">
    <div>
      <img src="/favicon.svg" width="34" height="34" alt="" />
    </div>
    <div className="grow leading-[2.4rem]">
      Pin Talisman for easy access
      <br />
      Click <ExtensionButtonIcon className="inline-block align-baseline" /> then{" "}
      <PinIcon className="inline-block" /> to pin Talisman
    </div>
  </div>
)

// without this singleton, if the full page loader appears the hook and associated notification may trigger twice
const CACHE = {
  notified: false,
}

export const OnboardingToast = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const isFirefox = navigator.userAgent.toLowerCase().includes("firefox")

  useEffect(() => {
    if (!CACHE.notified && searchParams.get("onboarded") !== null && !isFirefox) {
      CACHE.notified = true
      setSearchParams({})

      notifyCustom(OnboardNotification, {
        autoClose: false,
      })
    }
  }, [searchParams, setSearchParams, isFirefox])

  return null
}
