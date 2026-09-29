import { Subscribe } from "@react-rxjs/core"
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { type ReactNode, useState } from "react"
import { describe, expect, it, vi } from "vitest"

const StatefulWizardProvider = () => {
  const [clicks, setClicks] = useState(0)
  return (
    <button type="button" onClick={() => setClicks((prev) => prev + 1)}>
      {clicks}
    </button>
  )
}

vi.mock("../BittensorClaimModal/hooks/useBittensorClaimWizard", () => ({
  BittensorClaimWizardProvider: () => <StatefulWizardProvider />,
}))
vi.mock("../BittensorClaimModal/forms", () => ({ BittensorClaimModalRouter: () => null }))
vi.mock("../BittensorConvictionLockModal/useBittensorConvictionLockWizard", () => ({
  BITTENSOR_LOCK_MODAL_CONTAINER_ID: "lock-modal",
  BittensorConvictionLockWizardProvider: () => <StatefulWizardProvider />,
  useBittensorConvictionLockWizard: () => ({}),
}))
vi.mock("../BittensorConvictionLockModal/BittensorConvictionLockConfirm", () => ({
  BittensorConvictionLockConfirm: () => null,
}))
vi.mock("../BittensorConvictionLockModal/BittensorConvictionLockForm", () => ({
  BittensorConvictionLockForm: () => null,
}))
vi.mock("@ui/domains/Transactions/TxProgress", () => ({ TxProgress: () => null }))

import { BittensorClaimModal } from "../BittensorClaimModal"
import { useBittensorClaimModal } from "../BittensorClaimModal/hooks/useBittensorClaimModal"
import { BittensorConvictionLockModal } from "../BittensorConvictionLockModal"
import { useBittensorConvictionLockModal } from "../hooks/useBittensorConvictionLockModal"

const wrapper = ({ children }: { children: ReactNode }) => <Subscribe>{children}</Subscribe>

const expectWizardResetOnReopen = (open: () => void) => {
  act(open)
  fireEvent.click(screen.getByText("0"))
  expect(screen.getByText("1")).toBeTruthy()

  act(open)
  expect(screen.getByText("0")).toBeTruthy()
}

describe("Bittensor wizard modals", () => {
  it("resets the claim wizard when reopened for the same target", () => {
    render(<BittensorClaimModal />, { wrapper })
    const { result } = renderHook(() => useBittensorClaimModal(), { wrapper })
    const args = { networkId: "bittensor", address: "5Coldkey", hotkey: "5Hotkey" }

    expectWizardResetOnReopen(() => result.current.open(args))
  })

  it("resets the conviction lock wizard when reopened for the same target", () => {
    render(<BittensorConvictionLockModal />, { wrapper })
    const { result } = renderHook(() => useBittensorConvictionLockModal(), { wrapper })
    const args = { networkId: "bittensor", netuid: 1, address: "5Coldkey" }

    expectWizardResetOnReopen(() => result.current.open(args))
  })
})
