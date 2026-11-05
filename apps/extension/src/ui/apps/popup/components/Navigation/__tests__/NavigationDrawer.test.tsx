import { Subscribe } from "@react-rxjs/core"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { usePopupNavOpenClose } from "@ui/hooks/usePopupNavOpenClose"
import type { FC, ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const popup = vi.hoisted(() => ({ embedded: false }))
const api = vi.hoisted(() => ({
  dashboardOpen: vi.fn(),
  sendFundsOpen: vi.fn(async () => true),
  lock: vi.fn(),
}))

vi.mock("@ui/util/constants", () => ({
  get IS_EMBEDDED_POPUP() {
    return popup.embedded
  },
}))
vi.mock("@ui/api", () => ({ api }))
vi.mock("@ui/components/Drawer", () => ({
  Drawer: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}))
vi.mock("@ui/domains/Build/BuildVersionPill", () => ({ BuildVersionPill: () => null }))
vi.mock("@ui/domains/Ramps/useRampsModal", () => ({
  useRampsModal: () => ({ open: () => {} }),
}))
vi.mock("@ui/hooks/useMnemonicsAllBackedUp", () => ({ useMnemonicsAllBackedUp: () => true }))
vi.mock("@ui/state/accounts", () => ({ useAccounts: () => [{ address: "owned" }] }))
vi.mock("@ui/state/remoteConfig", () => ({ useFeatureFlag: () => false }))

import { NavigationDrawer } from "../NavigationDrawer"

const OpenMenu: FC = () => {
  const { open } = usePopupNavOpenClose()
  return (
    <button type="button" onClick={open}>
      More
    </button>
  )
}

const openMenuIn = (mode: "popout" | "embedded") => {
  popup.embedded = mode === "embedded"
  render(
    <Subscribe>
      <MemoryRouter initialEntries={["/portfolio"]}>
        <OpenMenu />
        <NavigationDrawer />
      </MemoryRouter>
    </Subscribe>
  )
  fireEvent.click(screen.getByRole("button", { name: "More" }))
}

const select = (item: string) => fireEvent.click(screen.getByRole("button", { name: item }))

const MENU_ITEMS = [
  ["Add Account", api.dashboardOpen, "/accounts/add"],
  ["Send Funds", api.sendFundsOpen, { entry: "nav_menu" }],
  ["Address Book", api.dashboardOpen, "/settings/address-book"],
  ["Manage Networks", api.dashboardOpen, "/settings/networks-tokens/networks"],
  ["Backup Wallet", api.dashboardOpen, "/settings/mnemonics"],
  ["All Settings", api.dashboardOpen, "/settings/general"],
] as const

describe("NavigationDrawer", () => {
  let closeWindow: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    closeWindow = vi.spyOn(window, "close").mockImplementation(() => {})
  })

  afterEach(() => {
    if (screen.queryByRole("button", { name: "Close menu" }))
      fireEvent.click(screen.getByRole("button", { name: "Close menu" }))
    cleanup()
    closeWindow.mockRestore()
  })

  test.each(MENU_ITEMS)(
    "%s keeps a popout window open and closes the menu",
    async (item, opener, destination) => {
      openMenuIn("popout")
      select(item)

      await waitFor(() => expect(screen.queryByRole("button", { name: item })).toBeNull())
      expect(opener).toHaveBeenCalledWith(destination)
      expect(closeWindow).not.toHaveBeenCalled()
    }
  )

  test.each(MENU_ITEMS)("%s closes the toolbar popup", async (item, opener, destination) => {
    openMenuIn("embedded")
    select(item)

    await waitFor(() => expect(closeWindow).toHaveBeenCalledOnce())
    expect(opener).toHaveBeenCalledWith(destination)
  })

  test.each(["popout", "embedded"] as const)("Lock Wallet closes the %s window", (mode) => {
    openMenuIn(mode)
    select("Lock Wallet")

    expect(api.lock).toHaveBeenCalledOnce()
    expect(closeWindow).toHaveBeenCalledOnce()
  })

  test.each(["popout", "embedded"] as const)("Fullscreen closes the %s window", (mode) => {
    openMenuIn(mode)
    select("Fullscreen")

    expect(api.dashboardOpen).toHaveBeenCalledWith("/portfolio")
    expect(closeWindow).toHaveBeenCalledOnce()
  })
})
