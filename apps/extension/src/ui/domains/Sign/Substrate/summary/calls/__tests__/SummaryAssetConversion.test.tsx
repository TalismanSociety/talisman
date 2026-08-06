import { render } from "@testing-library/react"
import { type FC, Fragment, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

const fx = vi.hoisted(() => {
  const CHAIN_ID = "polkadot-asset-hub"
  const chain = { id: CHAIN_ID, prefix: 0, topology: { type: "parachain", relayId: "polkadot" } }
  const tokens = [
    {
      id: "polkadot-asset-hub-substrate-native",
      type: "substrate-native",
      networkId: CHAIN_ID,
      symbol: "DOT",
      decimals: 10,
    },
    {
      id: "polkadot-asset-hub-substrate-assets-1984",
      type: "substrate-assets",
      networkId: CHAIN_ID,
      assetId: "1984",
      symbol: "USDT",
      decimals: 6,
    },
    {
      id: "polkadot-asset-hub-substrate-assets-1337",
      type: "substrate-assets",
      networkId: CHAIN_ID,
      assetId: "1337",
      symbol: "USDC",
      decimals: 6,
    },
  ]
  return { CHAIN_ID, chain, tokens }
})

// The global test setup mocks `useTranslation` only, and this summary renders `<Trans />`.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (value: string) => value,
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
  Trans: ({ components = {} }: { components?: Record<string, ReactNode>; defaults?: string }) => (
    <>
      {Object.entries(components).map(([key, node]) => (
        <Fragment key={key}>{node}</Fragment>
      ))}
    </>
  ),
}))

vi.mock("@ui/state/chaindata", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ui/state/chaindata")>()
  return {
    ...actual,
    useNetworkById: () => fx.chain,
    useTokens: () => fx.tokens,
    useToken: (id: string) => fx.tokens.find((token) => token.id === id),
  }
})

// Surfaces the token symbol and planck it is given, so assertions can read what was rendered.
vi.mock("@ui/domains/Asset/TokensAndFiat", () => ({
  TokensAndFiat: ({ tokenId, planck }: { tokenId?: string; planck?: bigint | string }) => (
    <span data-testid="tokens-and-fiat">
      {fx.tokens.find((token) => token.id === tokenId)?.symbol}:{String(planck)}
    </span>
  ),
}))
vi.mock("@ui/domains/Asset/TokenLogo", () => ({ TokenLogo: () => null }))

import { SUMMARY_COMPONENTS_ASSET_CONVERSION } from "@ui/domains/Sign/Substrate/summary/calls/SummaryAssetConversion"

const SwapExactTokensForTokens = SUMMARY_COMPONENTS_ASSET_CONVERSION[0][2] as unknown as FC<
  Record<string, unknown>
>

const SIGNER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

const AMOUNT_IN = 5_000_000_000_000n // 500 DOT
const AMOUNT_OUT_MIN = 1_000_000n // 1 unit of the last token in the path

const NATIVE_LOCATION = { parents: 0, interior: { type: "Here", value: undefined } }
const assetLocation = (assetId: bigint) => ({
  parents: 0,
  interior: {
    type: "X2",
    value: [
      { type: "PalletInstance", value: 50 },
      { type: "GeneralIndex", value: assetId },
    ],
  },
})

const MODES = ["block", "multiline", "compact"] as const

const renderSummary = (
  args: Record<string, unknown>,
  mode: (typeof MODES)[number],
  signer = SIGNER
) =>
  render(
    <SwapExactTokensForTokens
      decodedCall={{ pallet: "AssetConversion", method: "swap_exact_tokens_for_tokens", args }}
      sapi={{ chainId: fx.CHAIN_ID }}
      payload={{ address: signer }}
      mode={mode}
    />
  )

const swapArgs = (path: unknown[], sendTo = SIGNER) => ({
  path,
  amount_in: AMOUNT_IN,
  amount_out_min: AMOUNT_OUT_MIN,
  send_to: sendTo,
  keep_alive: false,
})

describe("AssetConversion swap_exact_tokens_for_tokens", () => {
  // `amount_out_min` is denominated in the last hop of the path, so a multi-hop swap that reported
  // path[1] as the output would name an intermediate token the signer never receives.
  it.each(MODES)("mode=%s: names the last token of a multi-hop path as the output", (mode) => {
    const { container } = renderSummary(
      swapArgs([NATIVE_LOCATION, assetLocation(1984n), assetLocation(1337n)]),
      mode
    )
    const text = container.textContent ?? ""

    expect(text).toContain("USDC")
    expect(text).not.toContain("USDT")
  })

  it.each(MODES)("mode=%s: names the second token of a direct path as the output", (mode) => {
    const { container } = renderSummary(swapArgs([NATIVE_LOCATION, assetLocation(1984n)]), mode)
    const text = container.textContent ?? ""

    expect(text).toContain("USDT")
    expect(text).not.toContain("USDC")
  })
})
