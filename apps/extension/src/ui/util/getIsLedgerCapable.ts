import { LedgerTransportType } from "extension-core"

export const getIsLedgerCapable = (type?: LedgerTransportType) => {
  const ledgerWindow = window as unknown as { USB?: unknown; HID?: unknown }
  const ledgerNavigator = window.navigator as unknown as { usb?: unknown; hid?: unknown }
  if (type === "usb") return !!ledgerWindow.USB || !!ledgerNavigator.usb
  if (type === "hid") return !!ledgerWindow.HID || !!ledgerNavigator.hid
  return !!ledgerWindow.USB || !!ledgerWindow.HID || !!ledgerNavigator.usb || !!ledgerNavigator.hid
}
