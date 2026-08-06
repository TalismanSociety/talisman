import { abiErc1155 } from "@core/util/abi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import type { FC, PropsWithChildren, ReactNode } from "react"
import { parseAbi } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

const fx = vi.hoisted(() => {
  const NATIVE_TOKEN_ID = "1-evm-native"
  return {
    NATIVE_TOKEN_ID,
    nativeToken: { id: NATIVE_TOKEN_ID, symbol: "ETH", decimals: 18 },
    reqMock: vi.fn(),
  }
})

vi.mock("@ui/domains/Sign/SignRequestContext", () => ({
  useEthSignTransactionRequest: () => fx.reqMock(),
  useEthSignKnownTransactionRequest: () => fx.reqMock(),
}))

vi.mock("@ui/state/chaindata", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ui/state/chaindata")>()
  return {
    ...actual,
    useToken: vi.fn((id?: string | null) => (id === fx.NATIVE_TOKEN_ID ? fx.nativeToken : null)),
    useTokens: vi.fn(() => []),
  }
})

vi.mock("@ui/state/settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ui/state/settings")>()),
  useSelectedCurrency: () => "usd",
}))

vi.mock("@ui/state/tokenRates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ui/state/tokenRates")>()),
  useTokenRates: () => null,
}))

vi.mock("@ui/domains/Sign/SignContainer", () => ({
  SignContainer: ({ title, alert, children }: Record<string, ReactNode>) => (
    <div>
      <div data-testid="title">{title}</div>
      <div data-testid="alert">{alert}</div>
      {children}
    </div>
  ),
}))

vi.mock("@ui/domains/Sign/Views/SignViewBodyShimmer", () => ({
  SignViewBodyShimmer: () => <div data-testid="shimmer" />,
}))

vi.mock("@ui/domains/Asset/TokenLogo", () => ({ TokenLogo: () => null }))

vi.mock("@ui/domains/Sign/Ethereum/shared", () => ({
  SignParamAccountButton: ({ address }: { address?: string }) => (
    <span data-testid="account">{address}</span>
  ),
  SignParamNetworkAddressButton: ({ address }: { address?: string }) => (
    <span data-testid="contract">{address}</span>
  ),
}))

vi.mock("@ui/domains/Sign/Ethereum/shared/SignParamTokensButton", () => ({
  SignParamTokensButton: (props: Record<string, unknown>) => (
    <span data-testid="erc20-amount">
      {String(props.tokens)} {String(props.symbol)}
    </span>
  ),
}))

vi.mock("@ui/domains/Sign/Ethereum/shared/SignParamTokensDisplay", () => ({
  SignParamTokensDisplay: (props: Record<string, unknown>) => (
    <span data-testid="native-amount">
      {String(props.tokens)} {String(props.symbol)}
    </span>
  ),
}))

import { EthSignBody } from "../EthSignBody"

const SIGNER = "0x1111111111111111111111111111111111111111"
const RECIPIENT = "0x2222222222222222222222222222222222222222"
const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const NFT_CONTRACT = "0x3333333333333333333333333333333333333333"

const NATIVE_VALUE = 5_000_000_000_000_000_000n // 5 ETH
const TOKEN_AMOUNT = 1_000n // 0.001 USDC

const erc20TransferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
]

const makeDecodedTx = (value: bigint) => ({
  contractType: "ERC20",
  contractCall: { functionName: "transfer", args: [RECIPIENT, TOKEN_AMOUNT] },
  abi: erc20TransferAbi,
  targetAddress: USDC_CONTRACT,
  isContractCall: true,
  value,
  asset: { name: "USD Coin", symbol: "USDC", decimals: 6 },
})

// biome-ignore lint/suspicious/noExplicitAny: test fixture only needs the fields the bodies read
const mockRequest = (decodedTx: any) => {
  fx.reqMock.mockReturnValue({
    account: { address: SIGNER },
    network: {
      id: "1",
      name: "Ethereum",
      nativeTokenId: fx.NATIVE_TOKEN_ID,
      blockExplorerUrls: ["https://etherscan.io"],
    },
    request: { from: SIGNER, to: decodedTx.targetAddress, value: decodedTx.value },
    decodedTx,
  })
  return decodedTx
}

const QueryWrapper: FC<PropsWithChildren> = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
)

const renderBody = (decodedTx: unknown, isReady = true) =>
  render(
    // biome-ignore lint/suspicious/noExplicitAny: see mockRequest
    <EthSignBody decodedTx={decodedTx as any} isReady={isReady} />,
    { wrapper: QueryWrapper }
  )

describe("EthSignBody", () => {
  beforeEach(() => {
    fx.reqMock.mockReset()
  })

  it("renders the shimmer until the transaction is decoded", () => {
    mockRequest(makeDecodedTx(0n))

    renderBody(null, false)

    expect(screen.getByTestId("shimmer")).toBeDefined()
  })

  it("renders the specialized body for a known call without native value", () => {
    const decodedTx = mockRequest(makeDecodedTx(0n))

    renderBody(decodedTx)

    expect(screen.getByTestId("erc20-amount").textContent).toContain("0.001 USDC")
    expect(screen.queryByTestId("native-amount")).toBeNull()
    expect(screen.getByTestId("alert").textContent).toBe("")
  })

  it("falls back to the generic body when a known call carries native value", () => {
    const decodedTx = mockRequest(makeDecodedTx(NATIVE_VALUE))

    renderBody(decodedTx)

    expect(screen.getByTestId("native-amount").textContent).toContain("5 ETH")
    expect(screen.queryByTestId("erc20-amount")).toBeNull()
    expect(screen.getByTestId("alert").textContent).toContain("ETH")
  })

  it("does not raise the native value alert on unknown calls", () => {
    const decodedTx = mockRequest({
      ...makeDecodedTx(NATIVE_VALUE),
      contractType: "unknown",
      contractCall: null,
    })

    renderBody(decodedTx)

    expect(screen.getByTestId("native-amount").textContent).toContain("5 ETH")
    expect(screen.getByTestId("alert").textContent).toBe("")
  })

  it("renders recipient, token id and amount of an ERC1155 transfer", async () => {
    const decodedTx = mockRequest({
      contractType: "ERC1155",
      contractCall: {
        functionName: "safeTransferFrom",
        args: [SIGNER, RECIPIENT, 42n, 1000n, "0x"],
      },
      abi: parseAbi(abiErc1155),
      targetAddress: NFT_CONTRACT,
      isContractCall: true,
      value: 0n,
      asset: { tokenId: 42n, decimals: 0 },
    })

    const { container } = renderBody(decodedTx)

    expect(await screen.findByText("1000 × #42")).toBeDefined()
    expect(container.textContent).toContain(RECIPIENT)
  })
})
