import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const mockEnroll = vi.fn()
const mockUnenroll = vi.fn()
const mockGetCredentialInfo = vi.fn()
const mockIsAvailable = vi.fn()
const mockCreateCredential = vi.fn()
const mockSignalRemoved = vi.fn()
const mockUseIsEnrolled = vi.fn()
const mockUseFeatureFlag = vi.fn()

vi.mock("@ui/api", () => ({
  api: {
    quickUnlockEnroll: (...args: unknown[]) => mockEnroll(...args),
    quickUnlockUnenroll: () => mockUnenroll(),
    quickUnlockGetCredentialInfo: () => mockGetCredentialInfo(),
  },
}))

// keep the real PrfEvaluationError, the component and the error message hook both test against it
vi.mock("@ui/util/webauthnPrf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ui/util/webauthnPrf")>()),
  isQuickUnlockAvailable: () => mockIsAvailable(),
  createQuickUnlockCredential: (...args: unknown[]) => mockCreateCredential(...args),
  signalCredentialRemoved: (...args: unknown[]) => mockSignalRemoved(...args),
}))

vi.mock("@ui/state/quickUnlock", () => ({
  useIsQuickUnlockEnrolled: () => mockUseIsEnrolled(),
}))

const trackFlowEvent = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track: vi.fn(), trackFlowEvent }))

vi.mock("@ui/state/remoteConfig", () => ({
  useFeatureFlag: (...args: unknown[]) => mockUseFeatureFlag(...args),
}))

import { PrfEvaluationError } from "@ui/util/webauthnPrf"

import { QuickUnlockSetting } from "../QuickUnlockSetting"

describe("QuickUnlockSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAvailable.mockResolvedValue(true)
    mockUseIsEnrolled.mockReturnValue(false)
    mockUseFeatureFlag.mockReturnValue(true)
    mockGetCredentialInfo.mockResolvedValue({ credentialId: "credId", prfSalt: "salt" })
  })

  test("is hidden when quick unlock is unavailable and not enrolled", async () => {
    mockIsAvailable.mockResolvedValue(false)

    render(<QuickUnlockSetting />)

    await waitFor(() => expect(mockIsAvailable).toHaveBeenCalled())
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  test("is hidden when the feature flag is off and not enrolled", async () => {
    mockUseFeatureFlag.mockReturnValue(false)

    render(<QuickUnlockSetting />)

    await waitFor(() => expect(mockUseFeatureFlag).toHaveBeenCalledWith("QUICK_UNLOCK"))
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  test("stays visible while enrolled even if the feature flag is off", async () => {
    mockUseFeatureFlag.mockReturnValue(false)
    mockUseIsEnrolled.mockReturnValue(true)

    render(<QuickUnlockSetting />)

    const toggle = (await screen.findByRole("checkbox")) as HTMLInputElement
    expect(toggle.checked).toBe(true)
  })

  test("stays visible while enrolled so the enrollment can be cleared", async () => {
    mockIsAvailable.mockResolvedValue(false)
    mockUseIsEnrolled.mockReturnValue(true)

    render(<QuickUnlockSetting />)

    const toggle = (await screen.findByRole("checkbox")) as HTMLInputElement
    expect(toggle.checked).toBe(true)
    expect(screen.getByText(/authenticator is unavailable/i)).toBeDefined()

    fireEvent.click(toggle)

    await waitFor(() => expect(mockUnenroll).toHaveBeenCalled())
    expect(mockSignalRemoved).toHaveBeenCalledWith("credId")
  })

  test("shows enrollment errors", async () => {
    mockCreateCredential.mockRejectedValue(new Error("This authenticator is not supported"))

    render(<QuickUnlockSetting />)

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

    render(<QuickUnlockSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))

    await waitFor(() => expect(mockSignalRemoved).toHaveBeenCalledWith("credId"))
    expect(await screen.findByText(/A passkey may have been created/i)).toBeDefined()
  })

  test("explains an authenticator that can't evaluate a PRF, and mentions the passkey", async () => {
    mockCreateCredential.mockRejectedValue(new PrfEvaluationError())

    render(<QuickUnlockSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))

    expect(await screen.findByText(/can't be used for quick unlock/i)).toBeDefined()
    expect(screen.getByText(/A passkey may have been created/i)).toBeDefined()
    // the raw error message must not reach the user
    expect(screen.queryByText(/PRF evaluation failed/i)).toBeNull()
  })

  test("explains browser exceptions instead of showing their name", async () => {
    mockCreateCredential.mockRejectedValue(new DOMException("rp id not allowed", "SecurityError"))

    render(<QuickUnlockSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))

    expect(await screen.findByText(/doesn't allow quick unlock/i)).toBeDefined()
    expect(screen.queryByText(/SecurityError/)).toBeNull()
  })

  test("stays silent when the user cancels the prompt", async () => {
    mockCreateCredential.mockRejectedValue(new DOMException("cancelled", "NotAllowedError"))

    render(<QuickUnlockSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))

    await waitFor(() => expect(mockCreateCredential).toHaveBeenCalled())
    // match the stable part of the subtitle, the authenticator names are copy that may change
    expect(screen.getByText(/unlock your wallet/i)).toBeDefined()
  })
})

describe("QuickUnlockSetting analytics", () => {
  const sent = () =>
    trackFlowEvent.mock.calls.map(([event, { flow_id: _, duration_ms: __, ...props }]) => ({
      event,
      ...props,
    }))

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAvailable.mockResolvedValue(true)
    mockUseIsEnrolled.mockReturnValue(false)
    mockUseFeatureFlag.mockReturnValue(true)
  })

  test("keeps one attempt across a cancelled prompt and the retry that enables it", async () => {
    mockCreateCredential.mockRejectedValueOnce(new DOMException("cancelled", "NotAllowedError"))
    render(<QuickUnlockSetting />)
    const toggle = await screen.findByRole("checkbox")

    fireEvent.click(toggle)
    await waitFor(() => expect(sent().at(-1)?.event).toBe("quick_unlock_setup_failed"))

    mockCreateCredential.mockResolvedValue({ credentialId: "c", prfSalt: "s", prfOutput: "p" })
    mockEnroll.mockResolvedValue(true)
    fireEvent.click(toggle)
    await waitFor(() => expect(sent().at(-1)?.event).toBe("quick_unlock_enabled"))

    expect(sent()).toEqual([
      { event: "quick_unlock_setup_started" },
      { event: "quick_unlock_setup_step_viewed", step: "passkey" },
      { event: "quick_unlock_setup_failed", last_step: "passkey", error_category: "user_rejected" },
      { event: "quick_unlock_setup_step_viewed", step: "enrol" },
      { event: "quick_unlock_setup_submitted", last_step: "enrol" },
      { event: "quick_unlock_enabled" },
    ])
    expect(new Set(trackFlowEvent.mock.calls.map(([, { flow_id }]) => flow_id)).size).toBe(1)
  })

  test("abandons with the last error when the user leaves after a refusal", async () => {
    mockCreateCredential.mockResolvedValue({ credentialId: "c", prfSalt: "s", prfOutput: "p" })
    mockEnroll.mockRejectedValue(new Error("Please log in again"))
    const { unmount } = render(<QuickUnlockSetting />)

    fireEvent.click(await screen.findByRole("checkbox"))
    await waitFor(() => expect(sent().at(-1)?.event).toBe("quick_unlock_setup_failed"))
    unmount()

    expect(sent().at(-1)).toEqual({
      event: "quick_unlock_setup_abandoned",
      last_step: "enrol",
      abandon_cause: "left",
      error_category: "unknown",
    })
  })

  test("starts nothing while the user only looks at the setting", async () => {
    render(<QuickUnlockSetting />)
    await screen.findByRole("checkbox")

    expect(trackFlowEvent).not.toHaveBeenCalled()
  })
})
