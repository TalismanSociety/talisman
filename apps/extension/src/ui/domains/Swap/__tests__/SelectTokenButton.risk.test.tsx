import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const MALICIOUS_ID = "1:evm-erc20:0x1111111111111111111111111111111111111111"
const BENIGN_ID = "1:evm-erc20:0x2222222222222222222222222222222222222222"
const UNCOVERED_ID = "11155111:evm-erc20:0x3333333333333333333333333333333333333333"
const SOLANA_ID = "solana-mainnet:sol-spl:5b5Eu6FvdNSxRfBE87aMDhkZmLnP3xL7CXwE4wFxHGwN"

const TOKENS = {
  [MALICIOUS_ID]: {
    id: MALICIOUS_ID,
    type: "evm-erc20",
    networkId: "1",
    symbol: "BAD",
    contractAddress: "0x1111111111111111111111111111111111111111",
  },
  [BENIGN_ID]: {
    id: BENIGN_ID,
    type: "evm-erc20",
    networkId: "1",
    symbol: "GOOD",
    contractAddress: "0x2222222222222222222222222222222222222222",
  },
  [UNCOVERED_ID]: {
    id: UNCOVERED_ID,
    type: "evm-erc20",
    networkId: "11155111",
    symbol: "SEP",
    contractAddress: "0x3333333333333333333333333333333333333333",
  },
  [SOLANA_ID]: {
    id: SOLANA_ID,
    type: "sol-spl",
    networkId: "solana-mainnet",
    symbol: "wSN1",
    mintAddress: "5b5Eu6FvdNSxRfBE87aMDhkZmLnP3xL7CXwE4wFxHGwN",
  },
}

const mockGandalfFetch = vi.fn()
const mockAcknowledgeToken = vi.fn()
const mockAcknowledgedTokenVerdicts = new Map<string, string>()
const mockGenericEvent = vi.fn()
const mockUseFeatureFlag = vi.fn()
const mockUseSettingValue = vi.fn()
const mockSafeTokens = new Set<string>()

vi.mock("react-i18next", () => ({
  Trans: ({ children }: { children: ReactNode }) => children,
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@talismn/icons", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/icons")>()),
  ShieldOkIcon: () => null,
}))

vi.mock("@ui/util/gandalfFetch", () => ({
  gandalfFetch: (...args: unknown[]) => mockGandalfFetch(...args),
}))

vi.mock("@ui/hooks/useAnalytics", () => ({
  useAnalytics: () => ({ genericEvent: mockGenericEvent }),
}))

vi.mock("@ui/state/remoteConfig", () => ({
  useRemoteConfig: () => ({ swaps: {} }),
  useFeatureFlag: (flag: string) => mockUseFeatureFlag(flag),
}))

vi.mock("@ui/state/settings", () => ({
  useSettingValue: (key: string) => mockUseSettingValue(key),
}))

vi.mock("@ui/state/chaindata", () => ({
  useTokensMap: () => TOKENS,
  useToken: (tokenId?: string) => (tokenId ? TOKENS[tokenId as keyof typeof TOKENS] : undefined),
  useNetworkById: () => ({ name: "Ethereum" }),
}))

vi.mock("../SwapProvider", () => ({
  useSwap: () => ({
    safeTokens: mockSafeTokens,
    acknowledgedTokenVerdicts: mockAcknowledgedTokenVerdicts,
    acknowledgeToken: mockAcknowledgeToken,
  }),
}))

vi.mock("../swap-services/useRecentTokenIds", () => ({ useRecentTokenIds: () => [] }))

// children stay mounted when closed, like the real Modal during its closing animation
vi.mock("@ui/components/Modal", () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => (
    <div hidden={!isOpen}>{children}</div>
  ),
}))

vi.mock("@ui/components/Drawer", () => ({
  Drawer: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
}))

vi.mock("@ui/components/WizardModalDialog", () => ({
  WizardModalDialog: ({
    children,
    onBackClick,
  }: {
    children: ReactNode
    onBackClick: () => void
  }) => (
    <div>
      <button type="button" onClick={onBackClick}>
        Dismiss picker
      </button>
      {children}
    </div>
  ),
}))

vi.mock("@ui/domains/Asset/TokenLogo", () => ({ TokenLogo: () => null }))
vi.mock("@ui/domains/Networks/NetworkLogo", () => ({ NetworkLogo: () => null }))

vi.mock("@ui/domains/Asset/TokenPicker", () => ({
  TokenPicker: ({ onSelect }: { onSelect: (tokenId: string) => void }) => (
    <div>
      {Object.values(TOKENS).map((token) => (
        <button key={token.id} type="button" onClick={() => onSelect(token.id)}>
          {token.symbol}
        </button>
      ))}
    </div>
  ),
}))

import { SelectTokenButton } from "../components/SelectTokenButton"

const scanResults = {
  "1:0x1111111111111111111111111111111111111111": {
    status: "hit",
    resultType: "Malicious",
    features: [{ id: "HONEYPOT", type: "Malicious", description: "Token cannot be sold" }],
  },
  "1:0x2222222222222222222222222222222222222222": {
    status: "hit",
    resultType: "Benign",
    features: [],
  },
  "11155111:0x3333333333333333333333333333333333333333": { status: "unsupported" },
}

const renderPicker = (priorityMode: "buy" | "sell") => {
  const onSelectTokenId = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SelectTokenButton
        allowedTokenIds={Object.keys(TOKENS)}
        onSelectTokenId={onSelectTokenId}
        priorityMode={priorityMode}
      />
    </QueryClientProvider>
  )
  fireEvent.click(screen.getByText("Select Token"))
  return onSelectTokenId
}

describe("SelectTokenButton token risk scan", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAcknowledgedTokenVerdicts.clear()
    mockSafeTokens.clear()
    mockSafeTokens.add(`1:${TOKENS[BENIGN_ID].contractAddress}`)
    mockUseFeatureFlag.mockReturnValue(true)
    mockUseSettingValue.mockReturnValue(true)
    mockGandalfFetch.mockResolvedValue(Response.json({ results: scanResults }))
  })

  it("selects a safe listed token without any scan or warning", () => {
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("GOOD"))

    expect(onSelectTokenId).toHaveBeenCalledWith(BENIGN_ID)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(mockGandalfFetch).not.toHaveBeenCalled()
  })

  it("warns about a Solana token outside the safe list", () => {
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("wSN1"))

    expect(screen.getByText("Warning")).toBeTruthy()
    expect(onSelectTokenId).not.toHaveBeenCalled()
  })

  it("selects a safe listed Solana token without any warning", () => {
    mockSafeTokens.add(`solana-mainnet:${TOKENS[SOLANA_ID].mintAddress}`)
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("wSN1"))

    expect(onSelectTokenId).toHaveBeenCalledWith(SOLANA_ID)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens the warning immediately and blocks accepting while the scan runs", async () => {
    let resolveFetch: (response: Response) => void = () => {}
    mockGandalfFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })
    )
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    expect(screen.getByText("Warning")).toBeTruthy()
    expect(screen.getByText("Scanning")).toBeTruthy()
    const accept = screen.getByText("I Understand").closest("button") as HTMLButtonElement
    expect(accept.disabled).toBe(true)

    resolveFetch(Response.json({ results: scanResults }))

    expect(await screen.findByText("Malicious")).toBeTruthy()
    expect(screen.queryByText("Scanning")).toBeNull()
    expect(onSelectTokenId).not.toHaveBeenCalled()
  })

  it("requires acknowledging a malicious token before buying it", async () => {
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    expect(await screen.findByText("Malicious")).toBeTruthy()
    const proceed = screen.getByText("Proceed").closest("button") as HTMLButtonElement
    expect(proceed.disabled).toBe(true)

    fireEvent.click(screen.getByLabelText("I acknowledge the risks"))
    expect(proceed.disabled).toBe(false)

    fireEvent.click(proceed)
    expect(mockAcknowledgeToken).toHaveBeenCalledWith(MALICIOUS_ID, "Malicious")
    expect(onSelectTokenId).toHaveBeenCalledWith(MALICIOUS_ID)
  })

  it("never blocks selling a malicious token", async () => {
    const onSelectTokenId = renderPicker("sell")

    fireEvent.click(screen.getByText("BAD"))

    expect(await screen.findByText("Malicious")).toBeTruthy()
    expect(screen.getByLabelText("I acknowledge the risks").closest(".invisible")).toBeTruthy()

    fireEvent.click(screen.getByText("I Understand"))
    expect(onSelectTokenId).toHaveBeenCalledWith(MALICIOUS_ID)
  })

  it("falls back to the safe list warning for unsupported networks", async () => {
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("SEP"))

    expect(await screen.findByText("Warning")).toBeTruthy()
    expect(onSelectTokenId).not.toHaveBeenCalled()

    const accept = screen.getByText("I Understand").closest("button") as HTMLButtonElement
    await waitFor(() => expect(accept.disabled).toBe(false))
    expect(screen.getByText("GoPlus Token Analysis")).toBeTruthy()
    expect(screen.queryByText("View Report")).toBeNull()
    expect(screen.getByText("Blockaid Token Scan")).toBeTruthy()
    expect(screen.getAllByText("Unavailable")).toHaveLength(2)

    fireEvent.click(accept)
    expect(onSelectTokenId).toHaveBeenCalledWith(UNCOVERED_ID)
  })

  it("skips the warning for a token acknowledged with the same verdict", async () => {
    mockAcknowledgedTokenVerdicts.set(MALICIOUS_ID, "Malicious")
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))
    expect(await screen.findByText("Malicious")).toBeTruthy()
    fireEvent.click(screen.getByText("Back"))
    fireEvent.click(screen.getByText("BAD"))

    expect(onSelectTokenId).toHaveBeenCalledWith(MALICIOUS_ID)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("warns about a malicious token that was only acknowledged as unknown", async () => {
    mockAcknowledgedTokenVerdicts.set(MALICIOUS_ID, "unknown")
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))
    expect(await screen.findByText("Malicious")).toBeTruthy()
    fireEvent.click(screen.getByText("Back"))
    fireEvent.click(screen.getByText("BAD"))

    expect(screen.getByRole("dialog")).toBeTruthy()
    expect(onSelectTokenId).not.toHaveBeenCalled()
  })

  it("retries a pending scan once", async () => {
    const pendingResults = { "1:0x1111111111111111111111111111111111111111": { status: "miss" } }
    mockGandalfFetch
      .mockResolvedValueOnce(Response.json({ results: pendingResults }))
      .mockResolvedValueOnce(Response.json({ results: scanResults }))
    renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    expect(await screen.findByText("Malicious")).toBeTruthy()
    expect(mockGandalfFetch).toHaveBeenCalledTimes(2)
    expect(mockGenericEvent).toHaveBeenCalledTimes(1)
  })

  it("lets the user accept a token whose scan is still pending after one retry", async () => {
    const pendingResults = { "1:0x1111111111111111111111111111111111111111": { status: "miss" } }
    mockGandalfFetch.mockImplementation(async () => Response.json({ results: pendingResults }))
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    const accept = screen.getByText("I Understand").closest("button") as HTMLButtonElement
    await waitFor(() => expect(accept.disabled).toBe(false))
    expect(mockGandalfFetch).toHaveBeenCalledTimes(2)

    fireEvent.click(accept)
    expect(mockAcknowledgeToken).toHaveBeenCalledWith(MALICIOUS_ID, "unknown")
    expect(onSelectTokenId).toHaveBeenCalledWith(MALICIOUS_ID)
  })

  it("closes the warning when the picker is dismissed", async () => {
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))
    expect(await screen.findByText("Malicious")).toBeTruthy()
    fireEvent.click(screen.getAllByText("Dismiss picker")[0])

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(onSelectTokenId).not.toHaveBeenCalled()
  })

  it("falls back to the safe list warning when scanning is disabled", async () => {
    mockUseSettingValue.mockReturnValue(false)
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    expect(await screen.findByText("Warning")).toBeTruthy()
    expect(mockGandalfFetch).not.toHaveBeenCalled()
    expect(onSelectTokenId).not.toHaveBeenCalled()
  })

  it("shows the GoPlus and Blockaid reports for a benign token outside the safe list", async () => {
    mockSafeTokens.clear()
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("GOOD"))

    expect(await screen.findByText("Passed")).toBeTruthy()
    expect(screen.getByRole("link", { name: "View Report" }).getAttribute("href")).toBe(
      `https://gopluslabs.io/token-security/1/${TOKENS[BENIGN_ID].contractAddress}`
    )
    expect(onSelectTokenId).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText("I Understand"))
    expect(mockAcknowledgeToken).toHaveBeenCalledWith(BENIGN_ID, "Benign")
    expect(onSelectTokenId).toHaveBeenCalledWith(BENIGN_ID)
  })
})
