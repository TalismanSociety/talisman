import "@common/enableAnyloggerLogsInDevelopment"
import "@common/i18nConfig"
import "@common/zodConfig"

import { renderTalisman } from "@ui"
import Onboarding from "@ui/apps/onboard"

renderTalisman(<Onboarding />, { keepWalletUnlockedMode: "always" })
