import { notify } from "@talisman/components/Notifications"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { QrIcon } from "@talismn/icons"
import { IconButton } from "talisman-ui"

import i18next from "../../common/i18nConfig"

export const copyAddress = async (address: string, onQrClick?: () => void) => {
  if (!address || address.toLowerCase().startsWith("javascript:")) return

  const toastId = `copy_${address}`

  try {
    await navigator.clipboard.writeText(address)
    notify(
      {
        type: "success",
        title: i18next.t(`Address copied`),
        subtitle: shortenAddress(address, 6, 6),
        right: onQrClick ? (
          <IconButton onClick={onQrClick}>
            <QrIcon />
          </IconButton>
        ) : undefined,
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
