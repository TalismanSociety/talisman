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

vi.mock("@ui/util/webauthnPrf", () => ({
  isBiometricAvailable: () => mockIsAvailable(),
  createBiometricCredential: (...args: unknown[]) => mockCreateCredential(...args),
  signalCredentialRemoved: (...args: unknown[]) => mockSignalRemoved(...args),
}))

vi.mock("@ui/state/biometric", () => ({
  useIsBiometricEnrolled: () => mockUseIsEnrolled(),
}))

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

  test("stays silent when the user cancels the prompt", async () => {
    mockCreateCredential.mockRejectedValue(new DOMException("cancelled", "NotAllowedError"))

    render(<BiometricSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))

    await waitFor(() => expect(mockCreateCredential).toHaveBeenCalled())
    expect(screen.getByText(/Touch ID or Windows Hello/i)).toBeDefined()
  })
})
