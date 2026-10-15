import { encodeAnyAddress } from "@talismn/crypto"
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { Routes } from "@ui/components/Routes"
import { MemoryRouter, Route } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AccountAddFlowProvider } from "../flow"
import { AccountAddSignetWizard } from "."

const getVaults = vi.hoisted(() => vi.fn())
const accountAddExternal = vi.hoisted(() => vi.fn())

vi.mock("@ui/util/signet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ui/util/signet")>()),
  signet: { getVaults },
}))
vi.mock("@ui/api", () => ({ api: { accountAddExternal } }))
vi.mock("@ui/api/track", () => ({ track: vi.fn(), trackFlowEvent: vi.fn() }))
vi.mock("../../AccountIcon", () => ({ AccountIcon: () => null }))
vi.mock("../../Address", () => ({ Address: () => null }))

const ADDRESSES = {
  GAV: "5F7LiCA6T4DWUDRQyFAWsRqVwxrJEznUtcw4WNnb5fe6snCH",
  ALICE: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
}
const POLKADOT_GENESIS_HASH = "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"

const vault = (address: string, name: string) => ({
  address,
  name,
  chain: {
    id: "polkadot",
    chainName: "Polkadot",
    logo: "",
    genesisHash: POLKADOT_GENESIS_HASH,
    isTestnet: false,
  },
})

const renderWizard = (onSuccess: (address: string) => void) =>
  render(
    <MemoryRouter initialEntries={["/accounts/add/signet"]}>
      <Routes>
        <Route
          path="/accounts/add/signet/*"
          element={
            <AccountAddFlowProvider>
              <AccountAddSignetWizard onSuccess={onSuccess} />
            </AccountAddFlowProvider>
          }
        />
      </Routes>
    </MemoryRouter>
  )

describe("AccountAddSignetWizard", () => {
  afterEach(cleanup)

  it("imports each vault once when Signet sends the same vault several times", async () => {
    const gavOnPolkadot = encodeAnyAddress(ADDRESSES.GAV, { ss58Format: 0 })
    getVaults.mockResolvedValue([
      vault(ADDRESSES.GAV, "Treasury"),
      vault(ADDRESSES.GAV, "Treasury"),
      vault(gavOnPolkadot, "Treasury"),
      vault(ADDRESSES.ALICE, "Payroll"),
    ])
    accountAddExternal.mockResolvedValue([ADDRESSES.GAV, ADDRESSES.ALICE])
    const onSuccess = vi.fn()
    const { getByRole, findByText, getAllByText } = renderWizard(onSuccess)

    fireEvent.click(getByRole("button", { name: "Connect" }))

    await findByText("Confirm Import?")
    expect(getAllByText("Treasury")).toHaveLength(1)
    expect(getAllByText("Payroll")).toHaveLength(1)

    fireEvent.click(getByRole("button", { name: "Confirm" }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(ADDRESSES.GAV))
    expect(accountAddExternal).toHaveBeenCalledTimes(1)
    expect(accountAddExternal).toHaveBeenCalledWith([
      {
        type: "signet",
        name: "Treasury",
        address: ADDRESSES.GAV,
        genesisHash: POLKADOT_GENESIS_HASH,
        url: "https://signet.talisman.xyz",
      },
      {
        type: "signet",
        name: "Payroll",
        address: ADDRESSES.ALICE,
        genesisHash: POLKADOT_GENESIS_HASH,
        url: "https://signet.talisman.xyz",
      },
    ])
  })
})
