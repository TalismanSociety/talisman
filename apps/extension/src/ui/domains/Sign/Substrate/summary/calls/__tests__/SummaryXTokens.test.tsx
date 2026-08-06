import { render } from "@testing-library/react"
import type { FC, ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

// The global test setup mocks `useTranslation` only, and these summaries render `<Trans />`.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (value: string) => value,
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
  Trans: ({ components }: { components?: Record<string, ReactNode>; defaults?: string }) => (
    <span>
      {Object.values(components ?? {}).map((child, i) => (
        <span key={String(i)}>{child}</span>
      ))}
    </span>
  ),
}))

// getTokenFromCurrency runs for real against these: currency_id 0 resolves the native token.
vi.mock("@ui/state/chaindata", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ui/state/chaindata")>()
  const nativeToken = {
    id: "acala-substrate-native",
    networkId: "acala",
    type: "substrate-native",
    symbol: "ACA",
    decimals: 12,
  }
  const makeNetwork = (id: string) => ({
    id,
    name: id === "hydration" ? "Hydration" : "Acala",
    prefix: id === "hydration" ? 63 : 10,
    nativeTokenId: "acala-substrate-native",
    topology: { type: "parachain", paraId: 2000, relayId: "polkadot" },
  })
  return {
    ...actual,
    useNetworkById: (id: string) => makeNetwork(id),
    useNetworks: () => [makeNetwork("acala"), makeNetwork("hydration")],
    useTokens: () => [nativeToken],
    useToken: () => nativeToken,
  }
})

// Stubbed to keep the harness free of papi codegen and MultiLocation decoding, neither of which is
// what these tests exercise.
vi.mock("@ui/domains/Sign/Substrate/util/getChainFromXcmLocation", () => ({
  getChainFromXcmLocation: () => ({ id: "hydration", prefix: 63, name: "Hydration" }),
}))
vi.mock("@ui/domains/Sign/Substrate/util/getAddressFromXcmLocation", () => ({
  getAddressFromXcmLocation: () => "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
}))

// Surfaces the planck value it is given verbatim, so assertions can read the rendered amounts.
vi.mock("@ui/domains/Asset/TokensAndFiat", () => ({
  TokensAndFiat: ({ planck }: { planck?: bigint | string }) => (
    <span data-testid="tokens-and-fiat">{String(planck)}</span>
  ),
}))
vi.mock("@ui/domains/Networks/NetworkLogo", () => ({
  NetworkLogo: () => <span data-testid="network-logo" />,
}))

// SummaryCrossChainTransfer statically imports SummaryAddressDisplay, so the account subtree loads
// in every mode. Stubbed to avoid keyring/state/clipboard module side effects.
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

import { SUMMARY_COMPONENTS_X_TOKENS } from "@ui/domains/Sign/Substrate/summary/calls/SummaryXTokens"

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

const AMOUNT = 1_000_000_000_000n // 1 ACA
const FEE = 4_242_424_242_424_242_424n // dwarfs the amount: the whole point of showing it

const getComponent = (method: string) =>
  SUMMARY_COMPONENTS_X_TOKENS.find(([, m]) => m === method)?.[2] as unknown as FC<
    Record<string, unknown>
  >

const dest = { type: "V4", value: { parents: 1, interior: { type: "Here", value: undefined } } }
const destWeightLimit = { type: "Unlimited", value: undefined }

const renderSummary = (
  method: "transfer" | "transfer_with_fee",
  args: Record<string, unknown>,
  mode: "block" | "multiline" | "compact"
) => {
  const Component = getComponent(method)
  return render(
    <Component
      decodedCall={{ pallet: "XTokens", method, args }}
      sapi={{ chainId: "acala" }}
      payload={{ address: ALICE }}
      mode={mode}
    />
  )
}

const MODES = ["block", "multiline", "compact"] as const

describe("XTokens transfer_with_fee", () => {
  // The pallet debits the signer `amount + fee`, so `fee` is a second, caller-controlled debit.
  // Displaying `amount` alone would understate the transaction by the whole of `fee`.
  it.each(MODES)("mode=%s: headline shows the total debited, not just the amount", (mode) => {
    const { container } = renderSummary(
      "transfer_with_fee",
      { currency_id: 0, amount: AMOUNT, fee: FEE, dest, dest_weight_limit: destWeightLimit },
      mode
    )
    const amounts = Array.from(container.querySelectorAll("[data-testid='tokens-and-fiat']")).map(
      (node) => node.textContent
    )

    expect(amounts).toContain(String(AMOUNT + FEE))
    expect(amounts).not.toContain(String(AMOUNT))
  })

  it("block mode breaks the fee out of the total", () => {
    const { container } = renderSummary(
      "transfer_with_fee",
      { currency_id: 0, amount: AMOUNT, fee: FEE, dest, dest_weight_limit: destWeightLimit },
      "block"
    )
    const amounts = Array.from(container.querySelectorAll("[data-testid='tokens-and-fiat']")).map(
      (node) => node.textContent
    )

    expect(amounts).toContain(String(AMOUNT + FEE))
    expect(amounts).toContain(String(FEE))
  })
})

describe("XTokens transfer", () => {
  it.each(MODES)("mode=%s: shows the amount, with no fee breakdown", (mode) => {
    const { container } = renderSummary(
      "transfer",
      { currency_id: 0, amount: AMOUNT, dest, dest_weight_limit: destWeightLimit },
      mode
    )
    const amounts = Array.from(container.querySelectorAll("[data-testid='tokens-and-fiat']")).map(
      (node) => node.textContent
    )

    expect(amounts).toStrictEqual([String(AMOUNT)])
  })
})
