import "@common/enableAnyloggerLogsInDevelopment"
import "@common/i18nConfig"

import { renderTalisman } from "@ui"
import { SupportOpsPage } from "@ui/apps/support"

renderTalisman(<SupportOpsPage />, { keepWalletUnlockedMode: "always" })
