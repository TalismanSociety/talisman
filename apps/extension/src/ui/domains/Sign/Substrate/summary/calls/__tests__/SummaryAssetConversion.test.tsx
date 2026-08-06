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

// Account subtree behind SummaryAddressDisplay, stubbed to avoid keyring/state/clipboard side
// effects while keeping the rendered address readable.
vi.mock("@ui/state/accounts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ui/state/accounts")>()
  return { ...actual, useAccountByAddress: () => null }
})
vi.mock("@core/domains/keyring/exports", () => ({ getAccountGenesisHash: () => undefined }))
vi.mock("@ui/util/copyAddress", () => ({ copyAddress: vi.fn() }))
vi.mock("@ui/domains/Account/AccountIcon", () => ({
  AccountIcon: () => <span data-testid="account-icon" />,
}))
vi.mock("@ui/domains/Account/Address", () => ({
  Address: ({ address }: { address: string }) => <span data-testid="address">{address}</span>,
}))
vi.mock("@ui/components/Tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

import { SUMMARY_COMPONENTS_ASSET_CONVERSION } from "@ui/domains/Sign/Substrate/summary/calls/SummaryAssetConversion"

const SwapExactTokensForTokens = SUMMARY_COMPONENTS_ASSET_CONVERSION[0][2] as unknown as FC<
  Record<string, unknown>
>

const SIGNER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const SIGNER_KUSAMA_SS58 = "HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F"
const OTHER_ACCOUNT = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"

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

  // `send_to` is the account credited with the swap output, and it is not necessarily the signer.
  it.each(MODES)("mode=%s: shows the account the output is paid to", (mode) => {
    const { container } = renderSummary(
      swapArgs([NATIVE_LOCATION, assetLocation(1984n)], OTHER_ACCOUNT),
      mode
    )

    expect(container.textContent ?? "").toContain(OTHER_ACCOUNT)
  })

  it("warns when the output is paid to an account other than the signer", () => {
    const { container } = renderSummary(
      swapArgs([NATIVE_LOCATION, assetLocation(1984n)], OTHER_ACCOUNT),
      "block"
    )

    expect(container.textContent ?? "").toContain("not to the signing account")
  })

  it("does not warn when the output is paid to the signer", () => {
    const { container } = renderSummary(swapArgs([NATIVE_LOCATION, assetLocation(1984n)]), "block")

    expect(container.textContent ?? "").not.toContain("not to the signing account")
  })

  it("does not warn when the output is paid to the signer under another ss58 prefix", () => {
    const { container } = renderSummary(
      swapArgs([NATIVE_LOCATION, assetLocation(1984n)], SIGNER_KUSAMA_SS58),
      "block"
    )

    expect(container.textContent ?? "").not.toContain("not to the signing account")
  })
})
