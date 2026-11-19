import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  isPopup: false,
  navigate: vi.fn(),
  dashboardOpen: vi.fn(),
  allBackedUp: true,
}))

vi.mock("@ui/util/constants", () => ({
  get IS_POPUP() {
    return mocks.isPopup
  },
  IS_EMBEDDED_POPUP: false,
}))
vi.mock("@ui/api", () => ({
  api: { dashboardOpen: mocks.dashboardOpen, sendFundsOpen: vi.fn(), lock: vi.fn() },
}))
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }))
vi.mock("@ui/domains/Portfolio/usePortfolioNavigation", () => ({
  usePortfolioNavigation: () => ({ selectedAccounts: [], selectedAccount: null }),
}))
vi.mock("@ui/domains/CopyAddress", () => ({ useCopyAddressModal: () => ({ open: vi.fn() }) }))
vi.mock("@ui/domains/Swap/hooks/useSwapModal", () => ({ useSwapModal: () => ({ open: vi.fn() }) }))
vi.mock("@ui/domains/Ramps/useRampsModal", () => ({ useRampsModal: () => ({ open: vi.fn() }) }))
vi.mock("@ui/apps/popup/components/Navigation/HelpAndSupportDrawer", () => ({
  useHelpAndSupportDrawerOpenClose: () => ({ open: vi.fn() }),
}))
vi.mock("@ui/domains/TaoDashboard/hooks/useIsBittensorEnabled", () => ({
  useIsBittensorEnabled: () => false,
  useDefaultTaoDashboardNetworkId: () => null,
}))
vi.mock("@ui/state/remoteConfig", () => ({ useFeatureFlag: () => false }))
vi.mock("@ui/hooks/useMnemonicsAllBackedUp", () => ({
  useMnemonicsAllBackedUp: () => mocks.allBackedUp,
}))

import { useAModeShortcuts } from "./useAModeShortcuts"

const findShortcut = (id: string) => {
  const { result } = renderHook(() => useAModeShortcuts())
  const shortcut = result.current.groups
    .flatMap((group) => group.shortcuts)
    .find((shortcut) => shortcut.id === id)
  if (!shortcut) throw new Error(`no shortcut ${id}`)
  return shortcut
}

describe("useAModeShortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isPopup = false
    mocks.allBackedUp = true
  })

  it("navigates inside the dashboard for a route shortcut", () => {
    const shortcut = findShortcut("address-book")
    act(() => shortcut.onClick())

    expect(mocks.navigate).toHaveBeenCalledWith("/settings/address-book")
    expect(mocks.dashboardOpen).not.toHaveBeenCalled()
  })

  it("opens the dashboard from the popup when the popup has no such route", () => {
    mocks.isPopup = true
    const shortcut = findShortcut("address-book")
    act(() => shortcut.onClick())

    expect(mocks.dashboardOpen).toHaveBeenCalledWith("/settings/address-book")
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it("navigates inside the popup when the popup has its own route", () => {
    mocks.isPopup = true
    const shortcut = findShortcut("manage-accounts")
    act(() => shortcut.onClick())

    expect(mocks.navigate).toHaveBeenCalledWith("/manage-accounts")
    expect(mocks.dashboardOpen).not.toHaveBeenCalled()
  })

  it("badges recovery phrases only while one is not backed up", () => {
    mocks.allBackedUp = false
    expect(findShortcut("recovery-phrases").badge).toBe(true)

    mocks.allBackedUp = true
    expect(findShortcut("recovery-phrases").badge).toBeFalsy()
  })

  it("keeps four primary actions, falling back to Earn when buying is off", () => {
    const { result } = renderHook(() => useAModeShortcuts())

    expect(result.current.primary.map((s) => s.id)).toEqual(["send", "receive", "swap", "earn"])
  })
})
