import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const pendingAction = {
  canCreateAction: true,
  action: null,
  isLoading: false,
  error: null,
  createAction: vi.fn(),
  refreshAction: vi.fn(),
  submitActionTransaction: vi.fn(),
}

vi.mock("@core/domains/keyring/exports", () => ({ isAccountOwned: () => true }))
vi.mock("@ui/api", () => ({ api: { yieldxyzPositionRefresh: vi.fn() } }))
vi.mock("@ui/state/accounts", () => ({ useAccountByAddress: () => ({}) }))
vi.mock("@ui/state/chaindata", () => ({ useNetworkById: () => null }))
vi.mock("../hooks/useYieldxyzPendingAction", () => ({
  useYieldxyzPendingAction: () => pendingAction,
}))
vi.mock("../hooks/useYieldxyzTransactionManager", () => ({
  useYieldxyzTransactionManager: () => ({}),
}))
vi.mock("./useYieldxyzManageModal", () => ({
  useYieldxyzManageModal: () => ({ close: vi.fn(), isOpen: true }),
}))

import type { PendingActionDto } from "@core/domains/earn/exports"
import type { YieldxyzPositionEnhanced } from "@ui/state/yieldxyz"
import { useYieldxyzManageWizard, YieldxyzManageWizardProvider } from "./useYieldxyzManageWizard"

const wrapper = ({ children }: { children: ReactNode }) => (
  <YieldxyzManageWizardProvider
    position={{ address: "0xabc", yieldId: "yield", networkId: "1" } as YieldxyzPositionEnhanced}
    pendingAction={{ type: "WITHDRAW" } as PendingActionDto}
    balance={null}
  >
    {children}
  </YieldxyzManageWizardProvider>
)

describe("useYieldxyzManageWizard", () => {
  beforeEach(() => {
    pendingAction.createAction = vi.fn()
  })

  it("creates the action once when the modal opens", () => {
    pendingAction.createAction.mockResolvedValue(undefined)

    const { rerender } = renderHook(() => useYieldxyzManageWizard(), { wrapper })
    rerender()

    expect(pendingAction.createAction).toHaveBeenCalledOnce()
  })

  it("creates the action again on retry after a failure", async () => {
    pendingAction.createAction.mockRejectedValueOnce(new Error("Position is locked"))
    pendingAction.createAction.mockResolvedValue(undefined)

    const { result } = renderHook(() => useYieldxyzManageWizard(), { wrapper })
    await waitFor(() => expect(pendingAction.createAction).toHaveBeenCalledOnce())

    act(() => result.current.retryCreateAction())

    expect(pendingAction.createAction).toHaveBeenCalledTimes(2)
  })

  it("does not create the action again once a retry succeeds", async () => {
    pendingAction.createAction.mockRejectedValueOnce(new Error("Position is locked"))
    pendingAction.createAction.mockResolvedValue(undefined)

    const { result, rerender } = renderHook(() => useYieldxyzManageWizard(), { wrapper })
    await waitFor(() => expect(pendingAction.createAction).toHaveBeenCalledOnce())
    await act(async () => result.current.retryCreateAction())

    const previousCreateAction = pendingAction.createAction
    pendingAction.createAction = vi.fn()
    rerender()

    expect(previousCreateAction).toHaveBeenCalledTimes(2)
    expect(pendingAction.createAction).not.toHaveBeenCalled()
  })
})
