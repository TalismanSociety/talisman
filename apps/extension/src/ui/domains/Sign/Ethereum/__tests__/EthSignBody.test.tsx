import { abiErc1155, abiPermit2, PERMIT2_ADDRESS } from "@core/util/abi"
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

vi.mock("@ui/domains/Sign/Ethereum/shared/SignParamErc20TokenButton", () => ({
  SignParamErc20TokenButton: ({ asset }: { asset: { symbol?: string } }) => (
    <span data-testid="erc20-token">{asset.symbol}</span>
  ),
}))

vi.mock("@ui/domains/Sign/Ethereum/shared/SignParamTokensDisplay", () => ({
  SignParamTokensDisplay: (props: Record<string, unknown>) => (
    <span data-testid="native-amount">
      {String(props.tokens)} {String(props.symbol)}
    </span>
  ),
}))

vi.mock("@ui/domains/Asset/TokensAndFiat", () => ({
  TokensAndFiat: ({ planck }: { planck?: string | bigint }) => (
    <span data-testid="alert-native-amount">{String(planck)}</span>
  ),
}))

import { EthSignBody } from "../EthSignBody"

const SIGNER = "0x1111111111111111111111111111111111111111"
const RECIPIENT = "0x2222222222222222222222222222222222222222"
const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const NFT_CONTRACT = "0x3333333333333333333333333333333333333333"

const NATIVE_VALUE = 5_000_000_000_000_000_000n // 5 ETH
const UNKNOWN_CALL_DATA = "0x87517c45" // permit2 approve, on a contract we don't know
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
const mockRequest = (decodedTx: any, data = "0x") => {
  fx.reqMock.mockReturnValue({
    account: { address: SIGNER },
    network: {
      id: "1",
      name: "Ethereum",
      nativeTokenId: fx.NATIVE_TOKEN_ID,
      blockExplorerUrls: ["https://etherscan.io"],
    },
    request: { from: SIGNER, to: decodedTx.targetAddress, value: decodedTx.value, data },
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

const alertsContainer = () => document.getElementById("sign-alerts-inject") as HTMLElement

describe("EthSignBody", () => {
  beforeEach(() => {
    fx.reqMock.mockReset()
    alertsContainer()?.remove()
    const alerts = document.createElement("div")
    alerts.id = "sign-alerts-inject"
    document.body.appendChild(alerts)
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
    expect(alertsContainer().textContent).toBe("")
  })

  it("keeps the specialized body and raises a value alert when a known call carries native value", () => {
    const decodedTx = mockRequest(makeDecodedTx(NATIVE_VALUE))

    renderBody(decodedTx)

    expect(screen.getByTestId("erc20-amount").textContent).toContain("0.001 USDC")
    expect(screen.getByTestId("alert-native-amount").textContent).toBe(String(NATIVE_VALUE))
    expect(alertsContainer().textContent).toContain("does not normally include")
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

  it("warns about calldata it could not decode, and shows its method id", () => {
    const decodedTx = mockRequest(
      { contractType: "unknown", targetAddress: USDC_CONTRACT, isContractCall: true, value: 0n },
      UNKNOWN_CALL_DATA
    )

    const { container } = renderBody(decodedTx)

    expect(screen.getByTestId("alert").textContent).toContain("cannot decode")
    expect(container.textContent).toContain("0x87517c45")
  })

  it("does not title an undecoded call carrying native value a transfer", () => {
    const decodedTx = mockRequest(
      {
        contractType: "unknown",
        targetAddress: USDC_CONTRACT,
        isContractCall: true,
        value: NATIVE_VALUE,
      },
      UNKNOWN_CALL_DATA
    )

    renderBody(decodedTx)

    expect(screen.getByTestId("title").textContent).toBe("Transaction Request")
    expect(screen.getByTestId("native-amount").textContent).toContain("5 ETH")
  })

  it("renders spender, token and unlimited amount of a Permit2 approval", () => {
    const amount = 2n ** 160n - 1n
    const decodedTx = mockRequest({
      contractType: "Permit2",
      contractCall: {
        functionName: "approve",
        args: [USDC_CONTRACT, RECIPIENT, amount, 2 ** 48 - 1],
      },
      abi: parseAbi(abiPermit2),
      targetAddress: PERMIT2_ADDRESS,
      isContractCall: true,
      value: 0n,
      asset: { name: "USD Coin", symbol: "USDC", decimals: 6, tokenAddress: USDC_CONTRACT },
    })

    const { container } = renderBody(decodedTx)

    expect(container.textContent).toContain("Unlimited")
    expect(screen.getByTestId("erc20-token").textContent).toBe("USDC")
    expect(screen.getByTestId("contract").textContent).toBe(RECIPIENT)
    expect(screen.getByTestId("alert").textContent).toContain("spend these tokens")
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
