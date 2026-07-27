import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const mockEnroll = vi.fn()
const mockUnenroll = vi.fn()
const mockGetCredentialInfo = vi.fn()
const mockIsAvailable = vi.fn()
const mockCreateCredential = vi.fn()
const mockSignalRemoved = vi.fn()
const mockUseIsEnrolled = vi.fn()

vi.mock("@ui/api", () => ({
  api: {
    biometricEnroll: (...args: unknown[]) => mockEnroll(...args),
    biometricUnenroll: () => mockUnenroll(),
    biometricGetCredentialInfo: () => mockGetCredentialInfo(),
  },
}))

// keep the real PrfEvaluationError, the component and the error message hook both test against it
vi.mock("@ui/util/webauthnPrf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ui/util/webauthnPrf")>()),
  isBiometricAvailable: () => mockIsAvailable(),
  createBiometricCredential: (...args: unknown[]) => mockCreateCredential(...args),
  signalCredentialRemoved: (...args: unknown[]) => mockSignalRemoved(...args),
}))

vi.mock("@ui/state/biometric", () => ({
  useIsBiometricEnrolled: () => mockUseIsEnrolled(),
}))

import { PrfEvaluationError } from "@ui/util/webauthnPrf"

import { BiometricSetting } from "../BiometricSetting"

describe("BiometricSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAvailable.mockResolvedValue(true)
    mockUseIsEnrolled.mockReturnValue(false)
    mockGetCredentialInfo.mockResolvedValue({ credentialId: "credId", prfSalt: "salt" })
  })

  test("is hidden when biometrics are unavailable and not enrolled", async () => {
    mockIsAvailable.mockResolvedValue(false)

    render(<BiometricSetting />)

    await waitFor(() => expect(mockIsAvailable).toHaveBeenCalled())
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  test("stays visible while enrolled so the enrollment can be cleared", async () => {
    mockIsAvailable.mockResolvedValue(false)
    mockUseIsEnrolled.mockReturnValue(true)

    render(<BiometricSetting />)

    const toggle = (await screen.findByRole("checkbox")) as HTMLInputElement
    expect(toggle.checked).toBe(true)
    expect(screen.getByText(/authenticator is unavailable/i)).toBeDefined()

    fireEvent.click(toggle)

    await waitFor(() => expect(mockUnenroll).toHaveBeenCalled())
    expect(mockSignalRemoved).toHaveBeenCalledWith("credId")
  })

  test("shows enrollment errors", async () => {
    mockCreateCredential.mockRejectedValue(new Error("This authenticator is not supported"))

    render(<BiometricSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))

    expect(await screen.findByText("This authenticator is not supported")).toBeDefined()
    expect(mockEnroll).not.toHaveBeenCalled()
  })

  test("removes the credential when enrollment is refused", async () => {
    mockCreateCredential.mockResolvedValue({
      credentialId: "credId",
      prfSalt: "salt",
      prfOutput: "prf",
    })
    mockEnroll.mockRejectedValue(new Error("Please log in again"))

    render(<BiometricSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))

    await waitFor(() => expect(mockSignalRemoved).toHaveBeenCalledWith("credId"))
    expect(await screen.findByText(/A passkey may have been created/i)).toBeDefined()
  })

  test("explains an authenticator that can't evaluate a PRF, and mentions the passkey", async () => {
    mockCreateCredential.mockRejectedValue(new PrfEvaluationError())

    render(<BiometricSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))

    expect(await screen.findByText(/can't be used for smart unlock/i)).toBeDefined()
    expect(screen.getByText(/A passkey may have been created/i)).toBeDefined()
    // the raw error message must not reach the user
    expect(screen.queryByText(/PRF evaluation failed/i)).toBeNull()
  })

  test("explains browser exceptions instead of showing their name", async () => {
    mockCreateCredential.mockRejectedValue(new DOMException("rp id not allowed", "SecurityError"))

    render(<BiometricSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))

    expect(await screen.findByText(/doesn't allow smart unlock/i)).toBeDefined()
    expect(screen.queryByText(/SecurityError/)).toBeNull()
  })

  test("stays silent when the user cancels the prompt", async () => {
    mockCreateCredential.mockRejectedValue(new DOMException("cancelled", "NotAllowedError"))

    render(<BiometricSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))

    await waitFor(() => expect(mockCreateCredential).toHaveBeenCalled())
    // match the stable part of the subtitle, the authenticator names are copy that may change
    expect(screen.getByText(/unlock your wallet/i)).toBeDefined()
  })
})
