export const getIsLedgerCapable = (type?: "usb" | "hid") => {
  const ledgerWindow = window as unknown as { USB?: unknown; HID?: unknown }
  const ledgerNavigator = window.navigator as unknown as { usb?: unknown; hid?: unknown }
  if (type === "usb") return !!ledgerWindow.USB || !!ledgerNavigator.usb
  if (type === "hid") return !!ledgerWindow.HID || !!ledgerNavigator.hid
  return (
    process.env.BUILD_TYPE === "dev" || // the Ledger emulator, see docs/ledger-emulator.md
    !!ledgerWindow.USB ||
    !!ledgerWindow.HID ||
    !!ledgerNavigator.usb ||
    !!ledgerNavigator.hid
  )
}
