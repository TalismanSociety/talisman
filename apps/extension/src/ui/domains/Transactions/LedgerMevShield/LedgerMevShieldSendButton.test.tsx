import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sign: vi.fn(),
  prepare: vi.fn(),
  submit: vi.fn(),
  getStorage: vi.fn(),
  track: vi.fn(),
  account: {} as { type: string; address: string; app: string; genesisHash?: string },
}))

vi.mock("@ui/api", () => ({
  api: { subPrepareMevShield: mocks.prepare, subSubmitMevShield: mocks.submit },
}))
vi.mock("@ui/hooks/ledger/useLedgerPolkadot", () => ({
  useLedgerPolkadot: () => ({ sign: mocks.sign }),
}))
vi.mock("@ui/hooks/sapi/useScaleApi", () => ({
  useScaleApi: () => ({
    data: {
      getStorage: mocks.getStorage,
      getPayloadWithMetadataHash: (payload: SignerPayloadJSON) => ({
        payload,
        txMetadata: new TextEncoder().encode(payload.method),
      }),
    },
  }),
}))
vi.mock("@ui/api/track", () => ({ track: mocks.track }))
vi.mock("@ui/state/accounts", () => ({ useAccountByAddress: () => mocks.account }))
vi.mock("@ui/components/Notifications", () => ({ notify: vi.fn() }))
vi.mock("@ui/components/Drawer", () => ({
  Drawer: ({ isOpen, children }: { isOpen?: boolean; children: ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}))
vi.mock("../../Sign/SignLedgerBase", () => ({
  SignLedgerBase: ({
    disabled,
    error,
    onSignClick,
    onDismissErrorClick,
  }: {
    disabled?: boolean
    error: Error | null
    onSignClick: () => void
    onDismissErrorClick: () => void
  }) => (
    <>
      <button type="button" disabled={disabled} onClick={onSignClick}>
        Sign on Ledger
      </button>
      {error && (
        <div role="alert">
          {error.message}
          <button type="button" onClick={onDismissErrorClick}>
            Dismiss
          </button>
        </div>
      )}
    </>
  ),
}))

import { LedgerMevShieldSendButton } from "./LedgerMevShieldSendButton"

const payload: SignerPayloadJSON = {
  address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  blockHash: "0x1234",
  blockNumber: "0x000003e8",
  era: "0x5500",
  genesisHash: "0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03",
  method: "0x0700",
  nonce: "0x0000000f",
  specVersion: "0x000001df",
  tip: "0x00000000000000000000000000000000",
  transactionVersion: "0x00000001",
  signedExtensions: ["CheckNonce", "CheckMetadataHash"],
  version: 4,
  mode: 1,
  metadataHash: "0xabcd",
  withSignedTransaction: true,
}
const outerPayload: SignerPayloadJSON = { ...payload, method: "0x1e01", era: "0x3200" }

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const readyWindow = (secondsLeft: number) => ({
  status: "ready",
  outerPayload,
  shieldWindow: { headNumber: 1010, deadline: Date.now() + secondsLeft * 1000 },
})

const onSubmitted = vi.fn()
const onPayloadLockChange = vi.fn()

const renderButton = () =>
  render(
    <LedgerMevShieldSendButton
      payload={payload}
      onSubmitted={onSubmitted}
      onPayloadLockChange={onPayloadLockChange}
    />
  )

describe("LedgerMevShieldSendButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.account = { type: "ledger-polkadot", address: payload.address, app: "Polkadot" }
    mocks.getStorage.mockResolvedValue("0x07")
    mocks.submit.mockResolvedValue({ status: "submitted", hash: "0xouter", innerHash: "0xinner" })
  })

  it("signs the inner payload, then the outer one at the next block, and submits both", async () => {
    mocks.sign.mockResolvedValueOnce("0x01").mockResolvedValueOnce("0x02")
    mocks.prepare.mockImplementation(async () => readyWindow(20))
    renderButton()

    fireEvent.click(screen.getByText("Sign on Ledger"))

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith("0xouter", "0xinner"))
    expect(mocks.sign.mock.calls.map(([signed, , proof]) => [signed, proof])).toEqual([
      [{ ...payload, nonce: "0x10" }, "0x307830373030"],
      [outerPayload, "0x307831653031"],
    ])
    expect(mocks.prepare).toHaveBeenCalledWith({ payload, innerSignature: "0x01" })
    expect(mocks.submit).toHaveBeenCalledWith({
      payload,
      innerSignature: "0x01",
      outerPayload,
      outerSignature: "0x02",
      shieldWindow: expect.objectContaining({ headNumber: 1010 }),
      txInfo: undefined,
    })
  })

  it("reads the MEV Shield key only after the first signature", async () => {
    const inner = deferred<string>()
    mocks.sign.mockReturnValueOnce(inner.promise)
    mocks.prepare.mockImplementation(async () => readyWindow(20))
    renderButton()

    fireEvent.click(screen.getByText("Sign on Ledger"))
    await screen.findByText("Approve on your Ledger")

    expect(mocks.prepare).not.toHaveBeenCalled()
    inner.resolve("0x01")
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalled())
  })

  it("does not prompt the Ledger when the network has no MEV Shield key", async () => {
    mocks.getStorage.mockResolvedValue(null)
    renderButton()

    fireEvent.click(screen.getByText("Sign on Ledger"))

    expect((await screen.findByRole("alert")).textContent).toContain("MEV Shield is unavailable")
    expect(mocks.sign).not.toHaveBeenCalled()
  })

  describe("with a countdown", () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
    afterEach(() => vi.useRealTimers())

    it("sends nothing when the second signature comes after the countdown, then retries it alone", async () => {
      const lateOuter = deferred<string>()
      mocks.sign
        .mockResolvedValueOnce("0x01")
        .mockReturnValueOnce(lateOuter.promise)
        .mockResolvedValueOnce("0x03")
      mocks.prepare
        .mockImplementationOnce(async () => readyWindow(9))
        .mockImplementationOnce(async () => readyWindow(20))
      renderButton()

      fireEvent.click(screen.getByText("Sign on Ledger"))
      await screen.findByRole("timer")
      await act(() => vi.advanceTimersByTimeAsync(9_000))
      expect(await screen.findByText("Time ran out")).toBeTruthy()
      expect(screen.getByRole("button", { name: "Try again" })).toHaveProperty("disabled", true)
      expect(mocks.track).toHaveBeenCalledWith("mev_shield_window_missed", {
        closed_during: "signing",
      })

      lateOuter.resolve("0x02")
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Try again" })).toHaveProperty("disabled", false)
      )
      expect(mocks.submit).not.toHaveBeenCalled()

      fireEvent.click(screen.getByText("Try again"))

      await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith("0xouter", "0xinner"))
      expect(mocks.sign).toHaveBeenCalledTimes(3)
      expect(mocks.prepare).toHaveBeenNthCalledWith(2, { payload, innerSignature: "0x01" })
      expect(mocks.submit).toHaveBeenCalledTimes(1)
      expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ outerSignature: "0x03" }))
      expect(mocks.track).toHaveBeenCalledTimes(1)
    })
  })

  it("waits for the next block rather than prompt the Ledger with too little time to sign", async () => {
    mocks.sign.mockResolvedValueOnce("0x01").mockResolvedValueOnce("0x02")
    const roomy = readyWindow(20)
    mocks.prepare
      .mockImplementationOnce(async () => readyWindow(5))
      .mockImplementationOnce(async () => roomy)
    renderButton()

    fireEvent.click(screen.getByText("Sign on Ledger"))

    await waitFor(() => expect(onSubmitted).toHaveBeenCalled())
    expect(mocks.prepare).toHaveBeenCalledTimes(2)
    expect(mocks.sign).toHaveBeenCalledTimes(2)
    expect(mocks.submit).toHaveBeenCalledWith(
      expect.objectContaining({ shieldWindow: roomy.shieldWindow })
    )
  })

  it("gives up with an error when every block leaves too little time to sign", async () => {
    mocks.sign.mockResolvedValueOnce("0x01")
    mocks.prepare.mockImplementation(async () => readyWindow(5))
    renderButton()

    fireEvent.click(screen.getByText("Sign on Ledger"))

    await screen.findByText("MEV Shield couldn't open a signing window in time. Please try again.")
    expect(mocks.prepare).toHaveBeenCalledTimes(3)
    expect(mocks.sign).toHaveBeenCalledTimes(1)
  })

  it("does not prompt the Ledger when cancelled while it checks the MEV Shield key", async () => {
    const nextKey = deferred<string>()
    mocks.getStorage.mockReturnValueOnce(nextKey.promise)
    renderButton()

    fireEvent.click(screen.getByText("Sign on Ledger"))
    fireEvent.click(await screen.findByText("Cancel"))
    nextKey.resolve("0x07")

    await waitFor(() => expect(onPayloadLockChange).toHaveBeenLastCalledWith(false))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mocks.sign).not.toHaveBeenCalled()
  })

  it("keeps the first signature when the submit fails", async () => {
    mocks.sign
      .mockResolvedValueOnce("0x01")
      .mockResolvedValueOnce("0x02")
      .mockResolvedValueOnce("0x03")
    mocks.prepare.mockImplementation(async () => readyWindow(20))
    mocks.submit.mockRejectedValueOnce(new Error("1014: Priority is too low"))
    renderButton()

    fireEvent.click(screen.getByText("Sign on Ledger"))
    fireEvent.click(await screen.findByText("Dismiss"))
    fireEvent.click(await screen.findByText("Try again"))

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith("0xouter", "0xinner"))
    expect(mocks.sign).toHaveBeenCalledTimes(3)
    expect(mocks.submit).toHaveBeenLastCalledWith(
      expect.objectContaining({ innerSignature: "0x01", outerSignature: "0x03" })
    )
  })

  it("offers a retry when the chain built block N + 2 before the broadcast", async () => {
    mocks.sign.mockResolvedValueOnce("0x01").mockResolvedValueOnce("0x02")
    mocks.prepare.mockImplementation(async () => readyWindow(20))
    mocks.submit.mockResolvedValue({ status: "missed" })
    renderButton()

    fireEvent.click(screen.getByText("Sign on Ledger"))

    expect(await screen.findByText("Time ran out")).toBeTruthy()
    expect(onSubmitted).not.toHaveBeenCalled()
    expect(mocks.track).toHaveBeenCalledWith("mev_shield_window_missed", {
      closed_during: "broadcast",
    })
  })

  it("releases the payload lock when the flow unmounts mid-signature", async () => {
    mocks.sign.mockReturnValueOnce(deferred<string>().promise)
    const { rerender } = renderButton()

    fireEvent.click(screen.getByText("Sign on Ledger"))
    await screen.findByText("Approve on your Ledger")
    expect(onPayloadLockChange).toHaveBeenLastCalledWith(true)

    mocks.account = { ...mocks.account, genesisHash: payload.genesisHash }
    rerender(
      <LedgerMevShieldSendButton
        payload={payload}
        onSubmitted={onSubmitted}
        onPayloadLockChange={onPayloadLockChange}
      />
    )

    expect(onPayloadLockChange).toHaveBeenLastCalledWith(false)
  })
})
