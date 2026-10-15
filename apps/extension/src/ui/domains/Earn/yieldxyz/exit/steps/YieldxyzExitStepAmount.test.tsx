import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGoTo = vi.fn()
const mockCreateAction = vi.fn()
const wizard = {
  amountOut: 1n as bigint | null,
  canCreateAction: true,
  goTo: mockGoTo,
  createAction: mockCreateAction,
  network: null,
  position: {
    address: "0xabc",
    networkId: "network",
    balances: [],
    product: {
      providerId: "provider",
      token: { decimals: 18, symbol: "TKN" },
      mechanics: { rewardClaiming: "auto", rewardSchedule: "day" },
    },
  },
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@ui/components/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock("@ui/domains/Asset/Fiat", () => ({ FiatFromUsd: () => null }))
vi.mock("@ui/domains/Asset/Tokens", () => ({ Tokens: () => null }))
vi.mock("@ui/domains/Earn/shared/AccountDisplay", () => ({ AccountDisplay: () => null }))
vi.mock("@ui/domains/Earn/shared/GenericAmountEdit", () => ({
  GenericAmountEdit: ({ error }: { error?: string | null }) => error ?? null,
}))
vi.mock("@ui/domains/Earn/yieldxyz/components/YieldxyzProviderLogo", () => ({
  YieldxyzProviderDisplay: () => null,
}))
vi.mock("@ui/domains/Networks/NetworkLogo", () => ({ NetworkLogo: () => null }))
vi.mock("@ui/domains/Networks/NetworkName", () => ({ NetworkName: () => null }))
vi.mock("@ui/hooks/useDateFnsLocale", () => ({ useDateFnsLocale: () => undefined }))
vi.mock("../../components/YieldxyzProductTitleDisplay", () => ({
  YieldxyzProductTitleDisplay: () => null,
}))
vi.mock("../../components/YieldxyzProductYieldDisplay", () => ({
  YieldxyzProductYieldDisplay: () => null,
}))
vi.mock("../useYieldxyzExitModal", () => ({ useYieldxyzExitModal: () => ({ close: vi.fn() }) }))
vi.mock("../useYieldxyzExitWizard", () => ({ useYieldxyzExitWizard: () => wizard }))

import { YieldxyzExitStepAmount } from "./YieldxyzExitStepAmount"

describe("YieldxyzExitStepAmount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wizard.amountOut = 1n
    wizard.canCreateAction = true
  })

  it("shows the createAction error and stays on the amount step", async () => {
    mockCreateAction.mockRejectedValue(new Error("Position is locked"))

    render(<YieldxyzExitStepAmount />)
    fireEvent.click(screen.getByText("Review"))

    expect(await screen.findByText("Position is locked")).toBeTruthy()
    expect(mockGoTo).not.toHaveBeenCalled()
  })

  it("hides the createAction error once the amount changes", async () => {
    mockCreateAction.mockRejectedValue(new Error("Position is locked"))

    const { rerender } = render(<YieldxyzExitStepAmount />)
    fireEvent.click(screen.getByText("Review"))
    await screen.findByText("Position is locked")

    wizard.amountOut = 2n
    rerender(<YieldxyzExitStepAmount />)

    expect(screen.queryByText("Position is locked")).toBeNull()
  })

  it("keeps the createAction error hidden when the failed amount is entered again", async () => {
    mockCreateAction.mockRejectedValue(new Error("Position is locked"))

    const { rerender } = render(<YieldxyzExitStepAmount />)
    fireEvent.click(screen.getByText("Review"))
    await screen.findByText("Position is locked")

    wizard.amountOut = 2n
    rerender(<YieldxyzExitStepAmount />)
    wizard.amountOut = 1n
    rerender(<YieldxyzExitStepAmount />)

    expect(screen.queryByText("Position is locked")).toBeNull()
  })

  it("hides the createAction error once the amount becomes invalid", async () => {
    mockCreateAction.mockRejectedValue(new Error("Position is locked"))

    const { rerender } = render(<YieldxyzExitStepAmount />)
    fireEvent.click(screen.getByText("Review"))
    await screen.findByText("Position is locked")

    wizard.canCreateAction = false
    rerender(<YieldxyzExitStepAmount />)

    expect(screen.queryByText("Position is locked")).toBeNull()
  })

  it("goes to the confirm step once the action is created", async () => {
    mockCreateAction.mockResolvedValue(undefined)

    render(<YieldxyzExitStepAmount />)
    fireEvent.click(screen.getByText("Review"))

    await waitFor(() => expect(mockGoTo).toHaveBeenCalledWith("confirm"))
  })
})
