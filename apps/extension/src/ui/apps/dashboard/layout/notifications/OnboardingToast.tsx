import { ExtensionButtonIcon, PinIcon } from "@talismn/icons"
import { useEffect, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { IS_FIREFOX } from "@extension/shared"
import { notifyCustom } from "@talisman/components/Notifications"

// without this singleton, if the full page loader appears the hook and associated notification may trigger twice
const CACHE = {
  notified: false,
}

export const OnboardingToast = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useTranslation()

  // OnboardNotification can only be a ReactNode, not a ReactComponent
  // (this is to conform to the react-toastify `ToastContent` interface)
  // so we have to build it here since we need the `t` reference, which comes from a hook
  const OnboardNotification = useMemo(
    () => (
      <div className="flex items-center gap-8 p-4">
        <div>
          <img src="/favicon.svg" width="34" height="34" alt="" />
        </div>
        <div className="grow leading-[2.4rem]">
          {t("Pin Talisman for easy access")}
          <br />
          <Trans
            t={t}
            defaults="Click <ExtensionButtonIcon /> then <PinIcon /> to pin Talisman"
            components={{
              ExtensionButtonIcon: <ExtensionButtonIcon className="inline-block align-baseline" />,
              PinIcon: <PinIcon className="inline-block" />,
            }}
          />
        </div>
      </div>
    ),
    [t],
  )

  useEffect(() => {
    if (!CACHE.notified && searchParams.get("onboarded") !== null && !IS_FIREFOX) {
      CACHE.notified = true
      setSearchParams({})

      notifyCustom(OnboardNotification, {
        autoClose: false,
      })
    }
  }, [searchParams, setSearchParams, OnboardNotification])

  return null
}
