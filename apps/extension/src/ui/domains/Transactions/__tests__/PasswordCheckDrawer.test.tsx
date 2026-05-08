import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { forwardRef, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockCheckPassword = vi.fn()
const mockNotify = vi.fn()

vi.mock("@ui/api", () => ({
  api: {
    checkPassword: (...args: unknown[]) => mockCheckPassword(...args),
  },
}))

vi.mock("@ui/components/Notifications", () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
}))

vi.mock("@ui/components/Drawer", () => ({
  Drawer: ({
    children,
    isOpen,
    onDismiss,
  }: {
    children: ReactNode
    isOpen: boolean
    onDismiss?: () => void
    anchor?: string
    containerId?: string
  }) =>
    isOpen ? (
      <div data-testid="drawer">
        <button type="button" data-testid="drawer-overlay" onClick={onDismiss} />
        {children}
      </div>
    ) : null,
}))

vi.mock("@ui/hooks/useOpenCloseStatus", () => ({
  useOpenCloseStatus: () => "open",
}))

vi.mock("@ui/components/CapsLockWarningIcon", () => ({
  CapsLockWarningIcon: () => null,
}))

vi.mock("@ui/components/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    processing,
    type,
  }: {
    children: ReactNode
    onClick?: () => void
    disabled?: boolean
    processing?: boolean
    type?: string
  }) => (
    <button
      type={type === "submit" ? "submit" : "button"}
      onClick={onClick}
      disabled={disabled || processing}
      data-processing={processing}
    >
      {children}
    </button>
  ),
}))

vi.mock("@ui/components/FormFieldContainer", () => ({
  FormFieldContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock("@ui/components/FormFieldInputText", () => ({
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  FormFieldInputText: forwardRef(({ before, after, ...props }: any, ref: any) => (
    <input data-testid="password-input" ref={ref} {...props} />
  )),
}))

vi.mock("@talismn/icons", () => ({
  KeyIcon: () => null,
}))

import { PasswordCheckDrawer } from "../PasswordCheckDrawer"

describe("PasswordCheckDrawer", () => {
  const onVerified = vi.fn()
  const onDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not render when closed", () => {
    render(<PasswordCheckDrawer isOpen={false} onVerified={onVerified} onDismiss={onDismiss} />)
    expect(screen.queryByTestId("drawer")).toBeNull()
  })

  it("renders password input when open", () => {
    render(<PasswordCheckDrawer isOpen={true} onVerified={onVerified} onDismiss={onDismiss} />)
    expect(screen.getByTestId("drawer")).toBeTruthy()
    expect(screen.getByTestId("password-input")).toBeTruthy()
  })

  it("calls onVerified when password is correct", async () => {
    mockCheckPassword.mockResolvedValueOnce(true)

    const { container } = render(
      <PasswordCheckDrawer isOpen={true} onVerified={onVerified} onDismiss={onDismiss} />
    )

    const input = screen.getByTestId("password-input")
    fireEvent.change(input, { target: { value: "correct-password" } })

    // Wait for react-hook-form validation
    const form = container.querySelector("form")!
    await waitFor(() => {
      const btn = screen.getByText("Confirm") as HTMLButtonElement
      expect(btn.disabled).toBe(false)
    })

    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockCheckPassword).toHaveBeenCalledWith("correct-password")
      expect(onVerified).toHaveBeenCalledTimes(1)
    })
  })

  it("shows toast and stays open when password is incorrect", async () => {
    mockCheckPassword.mockResolvedValueOnce(false)

    const { container } = render(
      <PasswordCheckDrawer isOpen={true} onVerified={onVerified} onDismiss={onDismiss} />
    )

    const input = screen.getByTestId("password-input")
    fireEvent.change(input, { target: { value: "wrong-password" } })

    const form = container.querySelector("form")!
    await waitFor(() => {
      const btn = screen.getByText("Confirm") as HTMLButtonElement
      expect(btn.disabled).toBe(false)
    })

    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockCheckPassword).toHaveBeenCalledWith("wrong-password")
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          title: "Incorrect password",
        })
      )
      expect(onVerified).not.toHaveBeenCalled()
    })

    expect(screen.getByTestId("drawer")).toBeTruthy()
  })

  it("shows toast when api.checkPassword throws", async () => {
    mockCheckPassword.mockRejectedValueOnce(new Error("Network error"))

    const { container } = render(
      <PasswordCheckDrawer isOpen={true} onVerified={onVerified} onDismiss={onDismiss} />
    )

    const input = screen.getByTestId("password-input")
    fireEvent.change(input, { target: { value: "any-password" } })

    const form = container.querySelector("form")!
    await waitFor(() => {
      const btn = screen.getByText("Confirm") as HTMLButtonElement
      expect(btn.disabled).toBe(false)
    })

    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          title: "Password check failed",
        })
      )
      expect(onVerified).not.toHaveBeenCalled()
    })
  })

  it("calls onDismiss when cancel button is clicked", () => {
    render(<PasswordCheckDrawer isOpen={true} onVerified={onVerified} onDismiss={onDismiss} />)

    const cancelButton = screen.getByText("Cancel")
    fireEvent.click(cancelButton)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
