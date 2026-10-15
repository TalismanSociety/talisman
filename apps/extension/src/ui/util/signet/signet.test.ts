import { afterEach, describe, expect, it, vi } from "vitest"

import { signet } from "./signet"

const SIGNET_URL = "https://signet.example.com"
const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const GENESIS_HASH = "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"

const openSignetTab = () => {
  const tab = { closed: false, close: vi.fn() }
  vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window)
  return tab
}

const postFromSignet = (vaults: unknown) =>
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { type: "signet(connect.continue)", vaults },
      origin: SIGNET_URL,
    })
  )

describe("signet.getVaults", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("resolves the vaults the current Signet posts, keeping only the fields the wallet uses", async () => {
    openSignetTab()
    const vaults = signet.getVaults(SIGNET_URL)

    postFromSignet([
      {
        address: ADDRESS,
        name: "Treasury",
        chain: {
          id: "polkadot",
          chainName: "Polkadot",
          logo: "https://signet.example.com/polkadot.svg",
          genesisHash: GENESIS_HASH,
          isTestnet: false,
        },
      },
    ])

    await expect(vaults).resolves.toEqual([
      { address: ADDRESS, name: "Treasury", chain: { genesisHash: GENESIS_HASH } },
    ])
  })

  it("accepts the vault shape of older Signets", async () => {
    openSignetTab()
    const vaults = signet.getVaults(SIGNET_URL)

    postFromSignet([
      {
        address: ADDRESS,
        name: "Treasury",
        chain: {
          squidIds: { chainData: "polkadot", txHistory: "polkadot" },
          chainName: "Polkadot",
          logo: "https://signet.example.com/polkadot.svg",
          genesisHash: GENESIS_HASH,
          isTestnet: false,
        },
      },
    ])

    await expect(vaults).resolves.toEqual([
      { address: ADDRESS, name: "Treasury", chain: { genesisHash: GENESIS_HASH } },
    ])
  })

  it("rejects a vault with a malformed genesis hash instead of returning it", async () => {
    const tab = openSignetTab()
    const vaults = signet.getVaults(SIGNET_URL)

    postFromSignet([{ address: ADDRESS, name: "Treasury", chain: { genesisHash: "0xnope" } }])

    await expect(vaults).rejects.toThrow(/does not recognise/)
    expect(tab.close).toHaveBeenCalled()
  })

  it("rejects a vault without an address", async () => {
    openSignetTab()
    const vaults = signet.getVaults(SIGNET_URL)

    postFromSignet([{ name: "Treasury", chain: { genesisHash: GENESIS_HASH } }])

    await expect(vaults).rejects.toThrow(/does not recognise/)
  })
})
