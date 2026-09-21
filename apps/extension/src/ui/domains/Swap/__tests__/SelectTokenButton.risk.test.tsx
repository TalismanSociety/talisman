import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const MALICIOUS_ID = "1:evm-erc20:0x1111111111111111111111111111111111111111"
const BENIGN_ID = "1:evm-erc20:0x2222222222222222222222222222222222222222"
const UNCOVERED_ID = "11155111:evm-erc20:0x3333333333333333333333333333333333333333"

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
    mockSafeTokens.add(`1:${TOKENS[MALICIOUS_ID].contractAddress}`)
    mockSafeTokens.add(`1:${TOKENS[BENIGN_ID].contractAddress}`)
    mockUseFeatureFlag.mockReturnValue(true)
    mockUseSettingValue.mockReturnValue(true)
    mockGandalfFetch.mockResolvedValue(Response.json({ results: scanResults }))
  })

  it("selects a benign token without any warning", async () => {
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("GOOD"))

    await waitFor(() => expect(onSelectTokenId).toHaveBeenCalledWith(BENIGN_ID))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(mockGenericEvent).toHaveBeenCalledWith("token risk scan", {
      surface: "swap-select",
      verdict: "Benign",
      chainId: "1",
    })
  })

  it("requires acknowledging a malicious token before buying it", async () => {
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    expect(await screen.findByText("Token cannot be sold")).toBeTruthy()
    expect(onSelectTokenId).not.toHaveBeenCalled()
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

    expect(await screen.findByText("Token cannot be sold")).toBeTruthy()
    expect(screen.queryByLabelText("I acknowledge the risks")).toBeNull()

    fireEvent.click(screen.getByText("I Understand"))
    expect(onSelectTokenId).toHaveBeenCalledWith(MALICIOUS_ID)
  })

  it("falls back to the safe list warning for unsupported networks", async () => {
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("SEP"))

    expect(await screen.findByText("Warning")).toBeTruthy()
    expect(onSelectTokenId).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText("I Understand"))
    expect(onSelectTokenId).toHaveBeenCalledWith(UNCOVERED_ID)
  })

  it("skips the warning for a token acknowledged with the same verdict", async () => {
    mockAcknowledgedTokenVerdicts.set(MALICIOUS_ID, "Malicious")
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    await waitFor(() => expect(onSelectTokenId).toHaveBeenCalledWith(MALICIOUS_ID))
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("warns about a malicious token that was only acknowledged as unknown", async () => {
    mockAcknowledgedTokenVerdicts.set(MALICIOUS_ID, "unknown")
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    expect(await screen.findByText("Token cannot be sold")).toBeTruthy()
    expect(onSelectTokenId).not.toHaveBeenCalled()
  })

  it("retries a pending scan once before selecting the token", async () => {
    const pendingResults = { "1:0x1111111111111111111111111111111111111111": { status: "miss" } }
    mockGandalfFetch
      .mockResolvedValueOnce(Response.json({ results: pendingResults }))
      .mockResolvedValueOnce(Response.json({ results: scanResults }))
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    expect(await screen.findByText("Token cannot be sold")).toBeTruthy()
    expect(mockGandalfFetch).toHaveBeenCalledTimes(2)
    expect(onSelectTokenId).not.toHaveBeenCalled()
    expect(mockGenericEvent).toHaveBeenCalledTimes(1)
  })

  it("selects a token whose scan is still pending after one retry", async () => {
    const pendingResults = { "1:0x2222222222222222222222222222222222222222": { status: "miss" } }
    mockGandalfFetch.mockImplementation(async () => Response.json({ results: pendingResults }))
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("GOOD"))

    await waitFor(() => expect(onSelectTokenId).toHaveBeenCalledWith(BENIGN_ID))
    expect(mockGandalfFetch).toHaveBeenCalledTimes(2)
  })

  it("drops a pending selection when the picker is dismissed", async () => {
    let resolveFetch: (response: Response) => void = () => {}
    mockGandalfFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })
    )
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("GOOD"))
    await waitFor(() => expect(mockGandalfFetch).toHaveBeenCalled())
    fireEvent.click(screen.getByText("Dismiss picker"))
    resolveFetch(Response.json({ results: scanResults }))
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(onSelectTokenId).not.toHaveBeenCalled()
  })

  it("falls back to the safe list warning when scanning is disabled", async () => {
    mockUseSettingValue.mockReturnValue(false)
    mockSafeTokens.clear()
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

    expect(await screen.findByText("Verified")).toBeTruthy()
    expect(screen.getByRole("link", { name: "View Report" }).getAttribute("href")).toBe(
      `https://gopluslabs.io/token-security/1/${TOKENS[BENIGN_ID].contractAddress}`
    )
    expect(onSelectTokenId).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText("I Understand"))
    expect(mockAcknowledgeToken).toHaveBeenCalledWith(BENIGN_ID, "Benign")
    expect(onSelectTokenId).toHaveBeenCalledWith(BENIGN_ID)
  })

  it("requires acknowledging a malicious token outside the safe list before buying it", async () => {
    mockSafeTokens.clear()
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    expect(await screen.findByText("Malicious")).toBeTruthy()
    const proceed = screen.getByText("Proceed").closest("button") as HTMLButtonElement
    expect(proceed.disabled).toBe(true)

    fireEvent.click(screen.getByLabelText("I acknowledge the risks"))
    fireEvent.click(proceed)

    expect(mockAcknowledgeToken).toHaveBeenCalledWith(MALICIOUS_ID, "Malicious")
    expect(onSelectTokenId).toHaveBeenCalledWith(MALICIOUS_ID)
  })

  it("never blocks selling a malicious token outside the safe list", async () => {
    mockSafeTokens.clear()
    const onSelectTokenId = renderPicker("sell")

    fireEvent.click(screen.getByText("BAD"))

    expect(await screen.findByText("Malicious")).toBeTruthy()
    expect(screen.queryByLabelText("I acknowledge the risks")).toBeNull()

    fireEvent.click(screen.getByText("I Understand"))
    expect(onSelectTokenId).toHaveBeenCalledWith(MALICIOUS_ID)
  })
})
