import "@common/enableAnyloggerLogsInDevelopment"
import "@common/i18nConfig"

import { renderTalisman } from "@ui"
import { Rescue } from "@ui/apps/rescue"

renderTalisman(<Rescue />, { keepWalletUnlockedMode: "always" })
