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
const mockGenericEvent = vi.fn()
const mockUseFeatureFlag = vi.fn()
const mockUseSettingValue = vi.fn()

vi.mock("react-i18next", () => ({
  Trans: ({ children }: { children: ReactNode }) => children,
  useTranslation: () => ({ t: (value: string) => value }),
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
    safeTokens: new Set<string>(),
    acknowledgedTokenIds: new Set<string>(),
    acknowledgeToken: mockAcknowledgeToken,
  }),
}))

vi.mock("../swap-services/useRecentTokenIds", () => ({ useRecentTokenIds: () => [] }))

vi.mock("@ui/components/Modal", () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? children : null,
}))

vi.mock("@ui/components/Drawer", () => ({
  Drawer: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
}))

vi.mock("@ui/components/WizardModalDialog", () => ({
  WizardModalDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
  "ethereum:0x1111111111111111111111111111111111111111": {
    status: "hit",
    resultType: "Malicious",
    features: [{ id: "HONEYPOT", type: "Malicious", description: "Token cannot be sold" }],
  },
  "ethereum:0x2222222222222222222222222222222222222222": {
    status: "hit",
    resultType: "Benign",
    features: [],
  },
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
      chain: "ethereum",
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
    expect(mockAcknowledgeToken).toHaveBeenCalledWith(MALICIOUS_ID)
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

  it("falls back to the safe list warning for uncovered networks", async () => {
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("SEP"))

    expect(await screen.findByText("Warning")).toBeTruthy()
    expect(mockGandalfFetch).not.toHaveBeenCalled()
    expect(onSelectTokenId).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText("I Understand"))
    expect(onSelectTokenId).toHaveBeenCalledWith(UNCOVERED_ID)
  })

  it("falls back to the safe list warning when scanning is disabled", async () => {
    mockUseSettingValue.mockReturnValue(false)
    const onSelectTokenId = renderPicker("buy")

    fireEvent.click(screen.getByText("BAD"))

    expect(await screen.findByText("Warning")).toBeTruthy()
    expect(mockGandalfFetch).not.toHaveBeenCalled()
    expect(onSelectTokenId).not.toHaveBeenCalled()
  })
})
