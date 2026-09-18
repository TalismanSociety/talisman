import { fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const TOKEN = {
  id: "8453:evm-erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  type: "evm-erc20",
  platform: "ethereum",
  networkId: "8453",
  symbol: "TST",
  decimals: 18,
  contractAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
}

const mockUseRequest = vi.fn()
const mockUseTokenRiskScan = vi.fn()

vi.mock("react-router-dom", () => ({ useParams: () => ({ id: "eth-watchasset.1" }) }))

vi.mock("@ui/state/requests", () => ({ useRequest: () => mockUseRequest() }))

vi.mock("@ui/state/balances", () => ({ useBalancesHydrate: () => {} }))

vi.mock("@ui/state/chaindata", () => ({
  useNetworkById: () => ({ id: "8453", platform: "ethereum", name: "Base" }),
}))

vi.mock("@ui/domains/TokenRisk/useTokenRiskScan", () => ({
  useTokenRiskScan: (...args: unknown[]) => mockUseTokenRiskScan(...args),
}))

vi.mock("@talismn/icons", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/icons")>()),
  ShieldOkIcon: () => null,
}))

vi.mock("@ui/components/AppPill", () => ({ AppPill: () => null }))
vi.mock("@ui/domains/Networks/NetworkLogo", () => ({ NetworkLogo: () => null }))
vi.mock("@ui/domains/Erc20Tokens/CustomErc20TokenViewDetails", () => ({
  CustomErc20TokenViewDetails: () => null,
}))

vi.mock("../../Layout/PopupLayout", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    PopupLayout: Container,
    PopupHeader: Container,
    PopupContent: Container,
    PopupFooter: Container,
  }
})

import { AddCustomErc20Token } from "../AddCustomErc20Token"

const getApproveButton = () => screen.getByText("Approve").closest("button") as HTMLButtonElement

describe("AddCustomErc20Token", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRequest.mockReturnValue({ url: "https://dapp.test", token: TOKEN, warnings: [] })
    mockUseTokenRiskScan.mockReturnValue({ ref: null, scan: undefined, isPending: false })
  })

  test("displays the request warnings as messages", () => {
    mockUseRequest.mockReturnValue({
      url: "https://dapp.test",
      token: TOKEN,
      warnings: [
        { type: "missing-coingecko-id" },
        { type: "symbol-mismatch", symbol: "TST", contractSymbol: "TEST" },
      ],
    })

    render(<AddCustomErc20Token />)

    expect(screen.getByText("- This token's address is not registered on CoinGecko")).toBeTruthy()
    expect(
      screen.getByText(
        "- Suggested symbol TST is different from the one defined on the contract (TEST)"
      )
    ).toBeTruthy()
  })

  test("blocks approval of a malicious token until the risks are acknowledged", () => {
    mockUseTokenRiskScan.mockReturnValue({
      ref: { chain: "base", address: TOKEN.contractAddress },
      scan: { verdict: "Malicious", features: [], fees: {}, financialStats: {} },
      isPending: false,
    })

    render(<AddCustomErc20Token />)

    expect(screen.getByText("Malicious")).toBeTruthy()
    expect(getApproveButton().disabled).toBe(true)

    fireEvent.click(screen.getByLabelText("I acknowledge the risks"))

    expect(getApproveButton().disabled).toBe(false)
  })

  test("does not block approval of a token with warnings", () => {
    mockUseTokenRiskScan.mockReturnValue({
      ref: { chain: "base", address: TOKEN.contractAddress },
      scan: { verdict: "Warning", features: [], fees: {}, financialStats: {} },
      isPending: false,
    })

    render(<AddCustomErc20Token />)

    expect(screen.getByText("Risky")).toBeTruthy()
    expect(screen.queryByLabelText("I acknowledge the risks")).toBeNull()
    expect(getApproveButton().disabled).toBe(false)
  })

  test("links to the GoPlus report of the token", () => {
    render(<AddCustomErc20Token />)

    expect(screen.getByRole("link", { name: "View Report" }).getAttribute("href")).toBe(
      `https://gopluslabs.io/token-security/8453/${TOKEN.contractAddress}`
    )
  })

  test("shows a benign verdict without blocking approval", () => {
    mockUseTokenRiskScan.mockReturnValue({
      ref: { chain: "base", address: TOKEN.contractAddress },
      scan: { verdict: "Benign", features: [], fees: {}, financialStats: {} },
      isPending: false,
    })

    render(<AddCustomErc20Token />)

    expect(screen.getByText("Verified")).toBeTruthy()
    expect(getApproveButton().disabled).toBe(false)
  })

  test("shows the scan in progress and holds approval until it completes", () => {
    mockUseTokenRiskScan.mockReturnValue({
      ref: { chain: "base", address: TOKEN.contractAddress },
      scan: undefined,
      isPending: true,
    })

    render(<AddCustomErc20Token />)

    expect(screen.getByText("Scanning")).toBeTruthy()
    expect(getApproveButton().disabled).toBe(true)
  })
})
