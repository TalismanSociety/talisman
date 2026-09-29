import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGoTo = vi.fn()
const mockCreateAction = vi.fn()
const mockUseAppState = vi.fn()
const wizard = {
  address: "0xabc",
  amountIn: 1n as bigint | null,
  canCreateAction: true,
  canGoBack: false,
  goBack: vi.fn(),
  goTo: mockGoTo,
  tokenIn: { id: "token", networkId: "network" },
  createAction: mockCreateAction,
  product: {
    providerId: "provider",
    mechanics: { rewardClaiming: "auto", rewardSchedule: "day" },
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

vi.mock("@ui/components/Tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@ui/components/WizardModalDialog", () => ({
  WizardModalDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock("@ui/domains/Account/AccountPillButton", () => ({ AccountPillButton: () => null }))
vi.mock("@ui/domains/Asset/TokensAndFiat", () => ({ TokensAndFiat: () => null }))
vi.mock("@ui/domains/Earn/shared/AmountEdit", () => ({ AmountEdit: () => null }))
vi.mock("@ui/domains/Earn/yieldxyz/components/YieldxyzProviderLogo", () => ({
  YieldxyzProviderDisplay: () => null,
}))
vi.mock("@ui/domains/Networks/NetworkLogo", () => ({ NetworkLogo: () => null }))
vi.mock("@ui/domains/Networks/NetworkName", () => ({ NetworkName: () => null }))
vi.mock("@ui/hooks/useDateFnsLocale", () => ({ useDateFnsLocale: () => undefined }))
vi.mock("@ui/state/app", () => ({ useAppState: () => mockUseAppState() }))
vi.mock("../../components/YieldxyzProductTitleDisplay", () => ({
  YieldxyzProductTitleDisplay: () => null,
}))
vi.mock("../../components/YieldxyzProductYieldDisplay", () => ({
  YieldxyzProductYieldDisplay: () => null,
}))
vi.mock("../useYieldxyzEnterModal", () => ({ useYieldxyzEnterModal: () => ({ close: vi.fn() }) }))
vi.mock("../useYieldxyzEnterWizard", () => ({ useYieldxyzEnterWizard: () => wizard }))
vi.mock("./EarnDisclaimerDrawer", () => ({
  EarnDisclaimerDrawer: ({ isOpen, onAccept }: { isOpen: boolean; onAccept: () => void }) =>
    isOpen ? (
      <button type="button" onClick={onAccept}>
        Accept
      </button>
    ) : null,
}))

import { YieldxyzEnterStepAmount } from "./YieldxyzEnterStepAmount"

describe("YieldxyzEnterStepAmount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wizard.amountIn = 1n
    mockUseAppState.mockReturnValue([true])
  })

  it("shows the createAction error and stays on the amount step", async () => {
    mockCreateAction.mockRejectedValue(new Error("Amount is below the minimum"))

    render(<YieldxyzEnterStepAmount />)
    fireEvent.click(screen.getByText("Review"))

    expect(await screen.findByText("Amount is below the minimum")).toBeTruthy()
    expect(mockGoTo).not.toHaveBeenCalled()
  })

  it("shows the createAction error after the disclaimer is accepted", async () => {
    mockUseAppState.mockReturnValue([false])
    mockCreateAction.mockRejectedValue(new Error("Amount is below the minimum"))

    render(<YieldxyzEnterStepAmount />)
    fireEvent.click(screen.getByText("Review"))
    fireEvent.click(screen.getByText("Accept"))

    expect(await screen.findByText("Amount is below the minimum")).toBeTruthy()
    expect(mockGoTo).not.toHaveBeenCalled()
  })

  it("hides the createAction error once the amount changes", async () => {
    mockCreateAction.mockRejectedValue(new Error("Amount is below the minimum"))

    const { rerender } = render(<YieldxyzEnterStepAmount />)
    fireEvent.click(screen.getByText("Review"))
    await screen.findByText("Amount is below the minimum")

    wizard.amountIn = 2n
    rerender(<YieldxyzEnterStepAmount />)

    expect(screen.queryByText("Amount is below the minimum")).toBeNull()
  })

  it("goes to the confirm step once the action is created", async () => {
    mockCreateAction.mockResolvedValue(undefined)

    render(<YieldxyzEnterStepAmount />)
    fireEvent.click(screen.getByText("Review"))

    await waitFor(() => expect(mockGoTo).toHaveBeenCalledWith("confirm"))
  })
})
