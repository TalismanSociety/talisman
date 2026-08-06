import type { EthSignRequest } from "@core/domains/signing/types"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

const fx = vi.hoisted(() => ({
  network: {
    id: "1",
    name: "Ethereum",
    nativeTokenId: "1-evm-native",
    blockExplorerUrls: ["https://etherscan.io"],
  },
  nativeToken: { id: "1-evm-native", symbol: "ETH", decimals: 18 },
  erc20Token: { id: "1-evm-erc20-usdc", symbol: "USDC", decimals: 6 },
}))

vi.mock("@ui/state/chaindata", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ui/state/chaindata")>()),
  useNetworkById: () => fx.network,
  useToken: () => fx.nativeToken,
  useTokens: () => [],
}))

vi.mock("@ui/domains/Sign/Ethereum/hooks/useEvmTokenInfo", () => ({
  useEvmTokenInfo: () => ({ token: fx.erc20Token, isLoading: false, error: null }),
}))

vi.mock("@ui/domains/Sign/Ethereum/shared", () => ({
  SignParamAccountButton: ({ address }: { address?: string }) => (
    <span data-testid="account">{address}</span>
  ),
  SignParamNetworkAddressButton: ({ address }: { address?: string }) => (
    <span data-testid="address">{address}</span>
  ),
}))

vi.mock("@ui/domains/Sign/Ethereum/shared/SignParamErc20TokenButton", () => ({
  SignParamErc20TokenButton: ({ asset }: { asset: { symbol?: string } }) => (
    <span data-testid="erc20-token">{asset.symbol}</span>
  ),
}))

vi.mock("@ui/domains/Sign/Message", () => ({ Message: () => <div data-testid="raw-message" /> }))

vi.mock("@ui/domains/Sign/risk-analysis/RiskAnalysisPillButton", () => ({
  RiskAnalysisPillButton: () => null,
}))

vi.mock("@ui/domains/Sign/ViewDetails/ViewDetailsButton", () => ({ ViewDetailsButton: () => null }))

vi.mock("@ui/components/Drawer", () => ({
  Drawer: ({ isOpen, children }: { isOpen?: boolean; children?: ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}))

import { EthSignBodyMessage } from "../EthSignBodyMessage"

const SIGNER = "0x1111111111111111111111111111111111111111"
const ATTACKER = "0x00000000000000000000000000000000deadbeef"
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
const NFT = "0x2222222222222222222222222222222222222222"
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3"

const MAX_UINT48 = (2n ** 48n - 1n).toString()
const MAX_UINT160 = (2n ** 160n - 1n).toString()
const IN_ONE_HOUR = Math.floor(Date.now() / 1000) + 3600

const renderMessage = (typedData: unknown) =>
  render(
    <EthSignBodyMessage
      account={{ address: SIGNER } as Parameters<typeof EthSignBodyMessage>[0]["account"]}
      request={
        {
          method: "eth_signTypedData_v4",
          request: JSON.stringify(typedData),
          ethChainId: 1,
        } as unknown as EthSignRequest
      }
    />
  )

describe("EthSignBodyMessage", () => {
  it("decodes a Permit2 allowance instead of showing raw typed data", () => {
    const { container } = renderMessage({
      primaryType: "PermitSingle",
      domain: { name: "Permit2", chainId: 1, verifyingContract: PERMIT2 },
      message: {
        details: { token: USDC, amount: MAX_UINT160, expiration: MAX_UINT48, nonce: 0 },
        spender: ATTACKER,
        sigDeadline: String(IN_ONE_HOUR),
      },
    })

    expect(container.textContent).toContain("permission to spend your tokens")
    expect(screen.getAllByTestId("address").map((el) => el.textContent)).toContain(ATTACKER)
    expect(screen.getByTestId("erc20-token").textContent).toBe("USDC")
    expect(container.textContent).toContain("Unlimited")
    // the allowance's own expiration is out of date range: it never expires
    expect(container.textContent).toContain("never")
    expect(container.textContent).toContain("spend all of these tokens on your behalf")
  })

  it("shows the amount and expiry of a bounded ERC-2612 permit", () => {
    const { container } = renderMessage({
      primaryType: "Permit",
      domain: { name: "USD Coin", chainId: 1, verifyingContract: USDC },
      message: {
        owner: SIGNER,
        spender: ATTACKER,
        value: "1500000",
        nonce: 0,
        deadline: String(IN_ONE_HOUR),
      },
    })

    expect(container.textContent).toContain("1.5")
    expect(container.textContent).not.toContain("Unlimited")
    expect(container.textContent).toContain(new Date(IN_ONE_HOUR * 1000).toLocaleString())
  })

  it("warns when a Seaport order pays the signer nothing", () => {
    const { container } = renderMessage({
      primaryType: "OrderComponents",
      domain: { name: "Seaport", chainId: 1, verifyingContract: NFT },
      message: {
        offerer: SIGNER,
        offer: [
          { itemType: 2, token: NFT, identifierOrCriteria: "42", startAmount: "1", endAmount: "1" },
        ],
        consideration: [
          {
            itemType: 0,
            token: "0x0000000000000000000000000000000000000000",
            identifierOrCriteria: "0",
            startAmount: "1000000000000000000",
            endAmount: "1000000000000000000",
            recipient: ATTACKER,
          },
        ],
        endTime: String(IN_ONE_HOUR),
      },
    })

    expect(container.textContent).toContain("trade your assets")
    expect(container.textContent).toContain("#42")
    expect(container.textContent).toContain("nothing")
    expect(container.textContent).toContain("pays you nothing in return")
  })

  it("keeps the generic view for typed data that grants nothing", () => {
    const { container } = renderMessage({
      primaryType: "Mail",
      domain: { name: "Mail", chainId: 1, verifyingContract: NFT },
      message: { contents: "hello" },
    })

    expect(container.textContent).toContain("You are signing typed data")
    expect(screen.getByTestId("raw-message")).toBeDefined()
  })
})
