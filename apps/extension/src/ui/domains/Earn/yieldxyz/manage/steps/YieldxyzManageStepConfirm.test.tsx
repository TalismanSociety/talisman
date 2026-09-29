import { fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRetryCreateAction = vi.fn()
const wizard = {
  position: {
    address: "0xabc",
    networkId: "network",
    product: { providerId: "provider" },
  },
  balance: null,
  network: null,
  transaction: null,
  action: null as { type: string; transactions: [] } | null,
  errorAction: null as Error | null,
  isLoadingAction: false,
  retryCreateAction: mockRetryCreateAction,
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@ui/components/Button", () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock("@ui/components/ModalDialog", () => ({
  ModalDialog: ({ title, children }: { title?: ReactNode; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock("@ui/domains/Sign/risk-analysis/context", () => ({
  RiskAnalysisProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock("../../../shared/AccountDisplay", () => ({ AccountDisplay: () => null }))
vi.mock("../../components/YieldxyzConfirm", () => ({
  YieldxyzConfirmBody: () => <div>Confirm body</div>,
}))
vi.mock("../../components/YieldxyzProductTitleDisplay", () => ({
  YieldxyzProductTitleDisplay: () => null,
}))
vi.mock("../../components/YieldxyzProviderLogo", () => ({ YieldxyzProviderDisplay: () => null }))
vi.mock("../../components/YieldxyzTokensAndFiat", () => ({ YieldxyzTokensAndFiat: () => null }))
vi.mock("../useYieldxyzManageModal", () => ({ useYieldxyzManageModal: () => ({ close: vi.fn() }) }))
vi.mock("../useYieldxyzManageWizard", () => ({ useYieldxyzManageWizard: () => wizard }))

import { YieldxyzManageStepConfirm } from "./YieldxyzManageStepConfirm"

describe("YieldxyzManageStepConfirm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wizard.action = null
    wizard.errorAction = null
    wizard.isLoadingAction = false
  })

  it("shows the createAction error with a retry", () => {
    wizard.errorAction = new Error("Position is locked")

    render(<YieldxyzManageStepConfirm />)
    fireEvent.click(screen.getByText("Retry"))

    expect(screen.getByText("Position is locked")).toBeTruthy()
    expect(mockRetryCreateAction).toHaveBeenCalledOnce()
  })

  it("shows the loader without an error while the action is created", () => {
    wizard.isLoadingAction = true

    render(<YieldxyzManageStepConfirm />)

    expect(screen.getByText("Preparing operation")).toBeTruthy()
    expect(screen.queryByText("Retry")).toBeNull()
  })

  it("keeps the confirm step when a created action fails to refresh", () => {
    wizard.action = { type: "CLAIM_REWARDS", transactions: [] }
    wizard.errorAction = new Error("Failed to refresh")

    render(<YieldxyzManageStepConfirm />)

    expect(screen.getByText("Confirm body")).toBeTruthy()
    expect(screen.queryByText("Retry")).toBeNull()
  })
})
