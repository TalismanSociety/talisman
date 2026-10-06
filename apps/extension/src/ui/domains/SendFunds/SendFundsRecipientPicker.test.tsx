import type { Account } from "@core/domains/keyring/exports"
import type { DotNetwork, Token } from "@talismn/chaindata-provider"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ASSET_HUB_GENESIS = "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f"

const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const CHARLIE = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"
const VAULT = "5F7LiCA6T4DWUDRQyFAWsRqVwxrJEznUtcw4WNnb5fe6snCH"

const ACCOUNTS: Account[] = [
  { type: "keypair", curve: "sr25519", address: ALICE, name: "Alice", createdAt: 0 },
  { type: "keypair", curve: "sr25519", address: BOB, name: "Bob", createdAt: 1 },
  {
    type: "signet",
    address: VAULT,
    name: "AH Debug 2",
    genesisHash: ASSET_HUB_GENESIS,
    url: "https://signet.talisman.xyz",
    createdAt: 2,
  },
  { type: "contact", address: CHARLIE, name: "Charlie", createdAt: 3 },
]

const ASSET_HUB = {
  id: "polkadot-asset-hub",
  name: "Polkadot Asset Hub",
  platform: "polkadot",
  genesisHash: ASSET_HUB_GENESIS,
  account: "*25519",
  prefix: 0,
  hasCheckMetadataHash: true,
} as unknown as DotNetwork

const DOT = {
  id: "polkadot-asset-hub:substrate-native",
  networkId: "polkadot-asset-hub",
  platform: "polkadot",
} as unknown as Token

const wizard = vi.hoisted(() => ({ set: vi.fn(), setRecipientSource: vi.fn() }))

vi.mock("@ui/apps/popup/pages/SendFunds/context", () => ({
  useSendFundsWizard: () => ({
    from: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    to: undefined,
    tokenId: "polkadot-asset-hub:substrate-native",
    set: wizard.set,
    setRecipientSource: wizard.setRecipientSource,
  }),
}))

vi.mock("./useSendFunds", () => ({
  useSendFunds: () => ({ setRecipientWarning: vi.fn() }),
}))

vi.mock("@ui/state/accounts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ui/state/accounts")>()),
  useAccounts: () => ACCOUNTS,
}))

vi.mock("@ui/state/chaindata", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ui/state/chaindata")>()),
  useNetworkById: () => ASSET_HUB,
  useToken: () => DOT,
}))

vi.mock("@talismn/icons", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/icons")>()),
  SignetIcon: () => null,
  TalismanHandIcon: () => null,
}))

vi.mock("@ui/components/ScrollContainer", () => ({
  ScrollContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock("@ui/hooks/useResolveNsName", () => ({
  useResolveNsName: () => [null, { isNsLookup: false, isNsFetching: false }],
}))

vi.mock("./SendFundsAccountsList", () => ({
  SendFundsAccountsList: ({
    accounts,
    header,
    onSelect,
  }: {
    accounts: { address: string; name?: string }[]
    header?: ReactNode
    onSelect?: (address: string) => void
  }) =>
    accounts.length ? (
      <section>
        {header}
        {accounts.map((account) => (
          <button type="button" key={account.address} onClick={() => onSelect?.(account.address)}>
            {account.name ?? account.address}
          </button>
        ))}
      </section>
    ) : null,
}))

import { SendFundsRecipientPicker } from "./SendFundsRecipientPicker"

const group = (label: string) => within(screen.getByText(label).closest("section") as HTMLElement)

const search = (value: string) =>
  fireEvent.change(screen.getByPlaceholderText("Enter address"), { target: { value } })

describe("SendFundsRecipientPicker", () => {
  beforeEach(() => {
    wizard.set.mockClear()
    wizard.setRecipientSource.mockClear()
  })
  afterEach(cleanup)

  it("lists a Signet vault on its network in a group of its own and selects it as a vault", () => {
    render(<SendFundsRecipientPicker />)

    expect(group("Signet Vaults").getByText("AH Debug 2")).toBeTruthy()
    expect(group("My Accounts").getByText("Bob")).toBeTruthy()
    expect(group("Contacts").getByText("Charlie")).toBeTruthy()

    fireEvent.click(screen.getByText("AH Debug 2"))

    expect(wizard.setRecipientSource).toHaveBeenCalledWith("signet_vault")
    expect(wizard.set).toHaveBeenCalledWith("to", VAULT, true)
  })

  it("finds a Signet vault by name and by pasted address, not as an unknown address", async () => {
    render(<SendFundsRecipientPicker />)

    search("debug")
    expect(await screen.findByText("AH Debug 2")).toBeTruthy()
    expect(screen.queryByText("Bob")).toBeNull()

    search(VAULT)
    expect(await screen.findByText("AH Debug 2")).toBeTruthy()
    expect(screen.queryByText(VAULT)).toBeNull()
  })
})
