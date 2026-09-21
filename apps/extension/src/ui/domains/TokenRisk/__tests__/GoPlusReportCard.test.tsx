import type { Token } from "@talismn/chaindata-provider"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { GoPlusReportCard } from "../GoPlusReportCard"

const BASE_TOKEN = {
  id: "8453:evm-erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  type: "evm-erc20",
  networkId: "8453",
  symbol: "USDC",
  contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
} as unknown as Token

const SPL_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
const SPL_TOKEN = {
  id: `solana-mainnet:sol-spl:${SPL_MINT}`,
  type: "sol-spl",
  networkId: "solana-mainnet",
  symbol: "USDC",
  mintAddress: SPL_MINT,
} as unknown as Token

const getReportLink = () => screen.queryByRole("link", { name: "View Report" })

describe("GoPlusReportCard", () => {
  it("links to the GoPlus report of an EVM token", () => {
    render(<GoPlusReportCard token={BASE_TOKEN} />)

    expect(getReportLink()?.getAttribute("href")).toBe(
      "https://gopluslabs.io/token-security/8453/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    )
  })

  it("links to the GoPlus report of a Solana token", () => {
    render(<GoPlusReportCard token={SPL_TOKEN} />)

    expect(getReportLink()?.getAttribute("href")).toBe(
      `https://gopluslabs.io/token-security/solana/${SPL_MINT}`
    )
  })

  it("renders nothing on chains GoPlus does not support", () => {
    render(<GoPlusReportCard token={{ ...BASE_TOKEN, networkId: "1284" } as Token} />)

    expect(getReportLink()).toBeNull()
  })
})
