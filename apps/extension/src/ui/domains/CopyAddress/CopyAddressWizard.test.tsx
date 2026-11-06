import type { Account } from "@core/domains/keyring/exports"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CopyAddressWizard } from "./CopyAddressWizard"
import type { CopyAddressWizardInputs } from "./types"

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const BOB_ON_POLKADOT = "14E5nqKAp3oAJcmzgZhUD2RcptBeUBScxKHgJKU4HPNcKVf3"

const ACCOUNTS: Account[] = [
  { type: "keypair", curve: "sr25519", address: ALICE, name: "Alice", createdAt: 0 },
  { type: "keypair", curve: "sr25519", address: BOB, name: "Bob", createdAt: 1 },
]

const POLKADOT = {
  id: "polkadot",
  name: "Polkadot",
  platform: "polkadot",
  account: "*25519",
  prefix: 0,
}

const copyAddress = vi.hoisted(() => vi.fn(async (_address: string) => true))

vi.mock("@ui/util/copyAddress", () => ({ copyAddress }))

vi.mock("./useCopyAddressModal", () => ({
  useCopyAddressModal: () => ({ open: vi.fn(), close: vi.fn(), isOpen: true, inputs: {} }),
}))

vi.mock("@ui/hooks/analytics/flows", () => ({
  flows: { receive: { completed: vi.fn() } },
  useFlow: vi.fn(),
}))

vi.mock("@ui/state/accounts", () => ({
  useAccounts: () => ACCOUNTS,
  useAccountByAddress: (address?: string) => ACCOUNTS.find((a) => a.address === address),
}))

vi.mock("@ui/state/chaindata", () => ({
  getNetworkById$: vi.fn(),
  useNetworkByGenesisHash: () => null,
  useNetworkById: (id?: string | null) => (id === POLKADOT.id ? POLKADOT : null),
  useNetworks: () => [POLKADOT],
  useNetworksMapById: () => ({ [POLKADOT.id]: POLKADOT }),
  useToken: () => null,
}))

vi.mock("@ui/state/balances", () => ({
  useBalancesByAddress: () => ({ each: [] }),
  useIsBalanceInitializing: () => false,
}))

vi.mock("@ui/state/bittensor", () => ({ BITTENSOR_NETWORK_ID: "bittensor" }))

vi.mock("@ui/hooks/useBalancesFiatTotalPerNetwork", () => ({
  useBalancesFiatTotalPerNetwork: () => ({}),
}))

vi.mock("@ui/components/ScrollContainer", () => ({
  ScrollContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock("../Account/AccountIcon", () => ({ AccountIcon: () => null }))
vi.mock("../Account/AccountTypeIcon", () => ({ AccountTypeIcon: () => null }))
vi.mock("../Networks/NetworkLogo", () => ({ NetworkLogo: () => null }))

const renderWizard = (inputs: CopyAddressWizardInputs) =>
  act(async () => {
    render(<CopyAddressWizard inputs={inputs} />)
  })

const click = (element: Element) =>
  act(async () => {
    fireEvent.click(element)
  })

const pickAccount = (name: string) => click(screen.getByText(name).closest("button") as Element)

const clickBack = () => click(screen.getByRole("button", { name: "Back" }))

const clickRowCopyIcon = (rowName: string) => {
  const row = screen.getByText(rowName).parentElement?.parentElement as HTMLElement
  const [, copyIcon] = within(row).getAllByRole("button")
  return click(copyIcon as Element)
}

describe("CopyAddressWizard", () => {
  beforeEach(() => copyAddress.mockClear())
  afterEach(cleanup)

  it("does not offer back on the first page of the wizard", async () => {
    await renderWizard({})

    screen.getByText("Select account")
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull()
  })

  it("steps back from the network picker to the account list", async () => {
    await renderWizard({})
    await pickAccount("Alice")

    await clickBack()

    screen.getByText("Select account")
    screen.getByText("Bob")
  })

  it("carries a new pick through after stepping back", async () => {
    await renderWizard({})
    await pickAccount("Alice")
    await clickBack()

    await pickAccount("Bob")

    screen.getByText("Select network")
    await clickRowCopyIcon("Polkadot")
    expect(copyAddress.mock.lastCall?.[0]).toBe(BOB_ON_POLKADOT)
  })

  it("does not offer back when the flow opens with the address already chosen", async () => {
    await renderWizard({ address: BOB })

    screen.getByText("Select network")
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull()
  })
})
