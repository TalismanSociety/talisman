import i18next from "@core/i18nConfig"
import { notify } from "@talisman/components/Notifications"
import { shortenAddress } from "@talisman/util/shortenAddress"

export const copyAddress = async (address: string, title?: string) => {
  if (!address || address.toLowerCase().startsWith("javascript:")) return

  const toastId = `copy_${address}`

  try {
    await navigator.clipboard.writeText(address)
    notify(
      {
        type: "success",
        title: title ?? i18next.t(`Address copied`),
        subtitle: shortenAddress(address),
      },
      // set an id to prevent multiple clicks to display multiple notifications
      { toastId }
    )
    return true
  } catch (err) {
    notify(
      {
        type: "error",
        title: i18next.t(`Copy failed`),
        subtitle: shortenAddress(address),
      },
      { toastId }
    )
    return false
  }
}
