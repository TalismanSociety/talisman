import type { AccountPolkadotVault } from "@core/domains/keyring/exports"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QrSubstrate } from "./QrSubstrate"

const track = vi.hoisted(() => vi.fn())
const trackFlowEvent = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track, trackFlowEvent }))

vi.mock("@ui/state/chaindata", () => ({ useNetworkByGenesisHash: () => null }))
vi.mock("@ui/state/settings", () => ({ useSetting: () => [false, () => {}] }))
vi.mock("./SignPayloadQrCode", () => ({ SignPayloadQrCode: () => null }))
vi.mock("./QrCodeSourceSelector", () => ({
  QrCodeSourceSelector: () => null,
  useQrCodeSourceSelectorState: () => ({ qrCodeSource: undefined }),
}))
vi.mock("@ui/domains/Sign/Qr/ScanQr", () => ({
  ScanQr: ({ onScan }: { onScan: (result: { signature: `0x${string}` }) => void }) => (
    <button type="button" onClick={() => onScan({ signature: "0x01" })}>
      scan
    </button>
  ),
}))

const sent = () =>
  trackFlowEvent.mock.calls.map(([event, { flow_id: _, duration_ms: __, ...props }]) => ({
    event: (event as string).replace("vault_sign_", ""),
    ...props,
  }))

const account = { type: "polkadot-vault", address: "5Grw" } as unknown as AccountPolkadotVault

const renderSigner = (onSignature = vi.fn()) =>
  render(
    <QrSubstrate
      requestedBy="dapp"
      account={account}
      containerId="main"
      onSignature={onSignature}
      onReject={() => {}}
    />
  )

describe("vault_sign flow", () => {
  beforeEach(() => trackFlowEvent.mockClear())
  afterEach(cleanup)

  it("starts when the QR shows, follows the pages and completes on the scanned signature", () => {
    const onSignature = vi.fn()
    renderSigner(onSignature)
    expect(sent()).toEqual([])

    fireEvent.click(screen.getByText("Sign with QR"))
    fireEvent.click(screen.getByText("Next"))
    fireEvent.click(screen.getByText("scan"))

    expect(sent()).toEqual([
      { event: "started", entry: "dapp" },
      { event: "step_viewed", step: "show_qr" },
      { event: "step_viewed", step: "scan_signature" },
      { event: "completed" },
    ])
    expect(onSignature).toHaveBeenCalledWith({ signature: "0x01" })
  })

  it("abandons on the QR page when the user goes back to the start", () => {
    renderSigner()

    fireEvent.click(screen.getByText("Sign with QR"))
    fireEvent.click(screen.getAllByRole("button")[0])

    expect(sent().at(-1)).toMatchObject({
      event: "abandoned",
      last_step: "show_qr",
      abandon_cause: "left",
    })
  })
})
