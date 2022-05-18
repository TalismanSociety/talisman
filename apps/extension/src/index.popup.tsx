import Popup from "@ui/apps/popup"
import { renderTalisman } from "./ui/"

// append a class on root HTML element if popup was opened from extension button
if (window.location.hash === "#embedded") document.documentElement.classList.add("embedded")

renderTalisman(<Popup />)
