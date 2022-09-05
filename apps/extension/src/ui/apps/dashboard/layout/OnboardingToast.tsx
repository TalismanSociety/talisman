import { Box } from "@talisman/components/Box"
import { ExtensionButtonIcon, PinIcon } from "@talisman/theme/icons"
import { notify } from "@ui/utils/notify"
import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"

const OnboardNotification = () => (
  <Box flex gap={1.6} align="center">
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

      notify(OnboardNotification, {
        autoClose: false,
      })
    }
  }, [searchParams, setSearchParams])

  return null
}
