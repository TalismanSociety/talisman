import { fireEvent, render, screen } from "@testing-library/react"
import { of } from "rxjs"
import { beforeEach, describe, expect, test, vi } from "vitest"

const NETWORK = { id: "8453", platform: "ethereum", name: "Base" }
const USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const EXISTING_TOKEN_ID = `8453:evm-erc20:${USDC_ADDRESS}`

const mockGetToken = vi.fn()
const mockGetUniswapV2TokenInfo = vi.fn()
const mockGetErc20TokenInfo = vi.fn()

vi.mock("@ui/apps/dashboard/layout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@ui/hooks/useAnalyticsPageView", () => ({ useAnalyticsPageView: () => {} }))

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }))

vi.mock("@ui/state/chaindata", () => ({
  useNetworks: () => [NETWORK],
  getNetworkById$: () => of(NETWORK),
  getToken$: (tokenId: string) => of(mockGetToken(tokenId)),
}))

vi.mock("@ui/domains/Networks/NetworkCombo", () => ({
  NetworkCombo: ({ onChange }: { onChange: (networkId: string) => void }) => (
    <button type="button" onClick={() => onChange("8453")}>
      select network
    </button>
  ),
}))

vi.mock("@ui/domains/Asset/AssetLogo", () => ({ AssetLogo: () => null }))

vi.mock("@ui/domains/Ethereum/usePublicClient", () => ({ getExtensionPublicClient: () => ({}) }))

vi.mock("@core/util/getUniswapV2TokenInfo", () => ({
  getUniswapV2TokenInfo: (...args: unknown[]) => mockGetUniswapV2TokenInfo(...args),
}))

vi.mock("@core/util/getErc20TokenInfo", () => ({
  getErc20TokenInfo: (...args: unknown[]) => mockGetErc20TokenInfo(...args),
}))

import { AddTokenPage } from "../AddTokenPage"

const selectNetworkAndEnterAddress = (address: string) => {
  render(<AddTokenPage />)

  fireEvent.click(screen.getByText("select network"))
  fireEvent.change(screen.getByPlaceholderText("0xdeadbeef...deadbeef"), {
    target: { value: address },
  })
}

describe("AddTokenPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetToken.mockReturnValue(null)
    mockGetUniswapV2TokenInfo.mockRejectedValue(new Error("not a uniswap v2 pair"))
    mockGetErc20TokenInfo.mockResolvedValue({
      id: EXISTING_TOKEN_ID,
      networkId: "8453",
      type: "evm-erc20",
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
      coingeckoId: "usd-coin",
    })
  })

  test("displays the error returned by the contract address validator", async () => {
    mockGetToken.mockImplementation((tokenId: string) =>
      tokenId === EXISTING_TOKEN_ID ? { id: tokenId } : null
    )

    selectNetworkAndEnterAddress(USDC_ADDRESS)

    expect(await screen.findByText("Token already exists")).toBeTruthy()
  })

  test("populates the token fields from the fetched token info", async () => {
    selectNetworkAndEnterAddress(USDC_ADDRESS)

    const symbol = await screen.findByDisplayValue("USDC")
    expect(symbol).toBeTruthy()
    expect(screen.getByDisplayValue(6)).toBeTruthy()
    expect(screen.getByDisplayValue("USD Coin")).toBeTruthy()
    expect(screen.getByDisplayValue("usd-coin")).toBeTruthy()
  })
})
