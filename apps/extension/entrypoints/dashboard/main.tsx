import "@common/cryptoConfig"
import "@common/enableAnyloggerLogsInDevelopment"
import "@common/i18nConfig"
import "@common/zodConfig"

import { renderTalisman } from "@ui"
import Dashboard from "@ui/apps/dashboard"

renderTalisman(<Dashboard />)
