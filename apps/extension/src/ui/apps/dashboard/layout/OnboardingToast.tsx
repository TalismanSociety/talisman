import { Box } from "@talisman/components/Box"
import { notifyCustom } from "@talisman/components/Notifications"
import { ExtensionButtonIcon, PinIcon } from "@talisman/theme/icons"
import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"

const OnboardNotification = () => (
  <Box flex gap={1.6} align="center" padding={0.8}>
    <Box>
      <img src="/favicon.svg" width="34" height="34" />
    </Box>
    <Box grow lineheightcustom={2.4}>
      Pin Talisman for easy access
      <br />
      Click <ExtensionButtonIcon /> then <PinIcon /> to pin Talisman
    </Box>
  </Box>
)

// without this singleton, if the full page loader appears the hook and associated notification may trigger twice
const CACHE = {
  notified: false,
}

export const OnboardingToast = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (!CACHE.notified && searchParams.get("onboarded") !== null) {
      CACHE.notified = true
      setSearchParams({})

      notifyCustom(OnboardNotification, {
        autoClose: false,
      })
    }
  }, [searchParams, setSearchParams])

  return null
}
