import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSubmit = vi.fn()
const mockOnSubmitted = vi.fn()
const mockUseAccountByAddress = vi.fn()
const mockUseScaleApi = vi.fn()
const mockPasswordDrawerOnVerified = vi.fn()

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@common/log", () => ({
  log: { error: vi.fn() },
}))

vi.mock("@ui/components/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    processing,
  }: {
    children: ReactNode
    onClick?: () => void
    disabled?: boolean
    processing?: boolean
    primary?: boolean
    [key: string]: unknown
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || processing}
      data-testid="send-button"
    >
      {children}
    </button>
  ),
}))

vi.mock("@ui/components/Notifications", () => ({
  notify: vi.fn(),
}))

vi.mock("@ui/components/SuspenseTracker", () => ({
  SuspenseTracker: () => null,
}))

vi.mock("@ui/hooks/sapi/useScaleApi", () => ({
  useScaleApi: (...args: unknown[]) => mockUseScaleApi(...args),
}))

vi.mock("@ui/state/accounts", () => ({
  useAccountByAddress: (...args: unknown[]) => mockUseAccountByAddress(...args),
}))

vi.mock("@core/domains/keyring/exports", () => ({}))

vi.mock("@ui/util/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}))

vi.mock("@talismn/icons", () => ({
  LoaderIcon: () => <span>Loading</span>,
}))

vi.mock("@talismn/scale", () => ({
  toHex: (v: unknown) => `0x${v}`,
}))

vi.mock("../../Sign/Qr/QrSubstrate", () => ({
  QrSubstrate: () => <div data-testid="qr-substrate" />,
}))

vi.mock("../../Sign/SignHardwareSubstrate", () => ({
  SignHardwareSubstrate: () => <div data-testid="sign-hardware" />,
}))

// Mock PasswordCheckDrawer to capture its props
vi.mock("../PasswordCheckDrawer", () => ({
  PasswordCheckDrawer: ({
    isOpen,
    onVerified,
    onDismiss,
  }: {
    isOpen: boolean
    containerId?: string
    onVerified: () => void
    onDismiss: () => void
  }) => {
    // Store onVerified so tests can trigger it
    mockPasswordDrawerOnVerified.mockImplementation(onVerified)
    return isOpen ? (
      <div data-testid="password-drawer">
        <button type="button" data-testid="password-verify" onClick={onVerified}>
          Verify
        </button>
        <button type="button" data-testid="password-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    ) : null
  },
}))

import type { SignerPayloadJSON } from "@core/domains/signing/types"

import { SapiSendButton } from "../SapiSendButton"

const mockPayload: SignerPayloadJSON = {
  address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  blockHash: "0x1234",
  blockNumber: "0x01",
  era: "0x00",
  genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
  method: "0x0000",
  nonce: "0x00",
  specVersion: "0x01",
  tip: "0x00",
  transactionVersion: "0x01",
  signedExtensions: [],
  version: 4,
}

describe("SapiSendButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseScaleApi.mockReturnValue({
      data: { submit: mockSubmit, getTypeRegistry: vi.fn() },
    })
  })

  describe("with keypair account", () => {
    beforeEach(() => {
      mockUseAccountByAddress.mockReturnValue({ type: "keypair", address: mockPayload.address })
    })

    it("submits directly when checkPassword is not set", async () => {
      mockSubmit.mockResolvedValueOnce({ hash: "0xabc" })

      render(<SapiSendButton payload={mockPayload} onSubmitted={mockOnSubmitted} />)

      const button = screen.getByTestId("send-button")
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled()
        expect(mockOnSubmitted).toHaveBeenCalledWith("0xabc")
      })
    })

    it("opens password drawer when checkPassword is true", () => {
      render(
        <SapiSendButton
          payload={mockPayload}
          onSubmitted={mockOnSubmitted}
          checkPassword
          containerId="test-container"
        />
      )

      // Drawer should not be visible initially
      expect(screen.queryByTestId("password-drawer")).toBeNull()

      // Click the send button
      const button = screen.getByTestId("send-button")
      fireEvent.click(button)

      // Drawer should now be visible
      expect(screen.getByTestId("password-drawer")).toBeTruthy()
      // Transaction should NOT have been submitted
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it("auto-submits after password verification", async () => {
      mockSubmit.mockResolvedValueOnce({ hash: "0xdef" })

      render(
        <SapiSendButton
          payload={mockPayload}
          onSubmitted={mockOnSubmitted}
          checkPassword
          containerId="test-container"
        />
      )

      // Open the drawer
      const button = screen.getByTestId("send-button")
      fireEvent.click(button)

      // Verify password
      const verifyButton = screen.getByTestId("password-verify")
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalled()
        expect(mockOnSubmitted).toHaveBeenCalledWith("0xdef")
      })
    })

    it("does not submit when password drawer is dismissed", () => {
      render(
        <SapiSendButton
          payload={mockPayload}
          onSubmitted={mockOnSubmitted}
          checkPassword
          containerId="test-container"
        />
      )

      // Open the drawer
      const button = screen.getByTestId("send-button")
      fireEvent.click(button)
      expect(screen.getByTestId("password-drawer")).toBeTruthy()

      // Dismiss the drawer
      const dismissButton = screen.getByTestId("password-dismiss")
      fireEvent.click(dismissButton)

      // Drawer should be closed and no submission
      expect(screen.queryByTestId("password-drawer")).toBeNull()
      expect(mockSubmit).not.toHaveBeenCalled()
    })

    it("ignores a stale password verification callback after dismiss", () => {
      render(
        <SapiSendButton
          payload={mockPayload}
          onSubmitted={mockOnSubmitted}
          checkPassword
          containerId="test-container"
        />
      )

      fireEvent.click(screen.getByTestId("send-button"))
      const staleVerify = mockPasswordDrawerOnVerified.getMockImplementation()
      expect(staleVerify).toBeDefined()

      fireEvent.click(screen.getByTestId("password-dismiss"))
      staleVerify?.()

      expect(mockSubmit).not.toHaveBeenCalled()
    })
  })

  describe("with ledger account", () => {
    beforeEach(() => {
      mockUseAccountByAddress.mockReturnValue({
        type: "ledger-polkadot",
        address: mockPayload.address,
      })
    })

    it("renders hardware signing component regardless of checkPassword", () => {
      render(
        <SapiSendButton
          payload={mockPayload}
          onSubmitted={mockOnSubmitted}
          checkPassword
          containerId="test-container"
        />
      )

      expect(screen.getByTestId("sign-hardware")).toBeTruthy()
      expect(screen.queryByTestId("password-drawer")).toBeNull()
    })
  })

  describe("with polkadot-vault account", () => {
    beforeEach(() => {
      mockUseAccountByAddress.mockReturnValue({
        type: "polkadot-vault",
        address: mockPayload.address,
      })
    })

    it("renders QR signing component regardless of checkPassword", () => {
      render(
        <SapiSendButton
          payload={mockPayload}
          onSubmitted={mockOnSubmitted}
          checkPassword
          containerId="test-container"
        />
      )

      expect(screen.getByTestId("qr-substrate")).toBeTruthy()
      expect(screen.queryByTestId("password-drawer")).toBeNull()
    })
  })
})
