import "@core/util/enableLogsInDevelopment"
import "@core/i18nConfig"

import { renderTalisman } from "@ui"
import Popup from "@ui/apps/popup"
import Browser from "webextension-polyfill"

// append a class on root HTML element if popup was opened from extension button
if (window.location.search === "?embedded") document.documentElement.classList.add("embedded")
// if not, we're in a window, reset zoom level to 100%
else Browser.tabs.setZoom(undefined, 0)

renderTalisman(<Popup />)
