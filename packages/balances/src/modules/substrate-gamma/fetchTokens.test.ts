import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { getStorageKeyPrefix, parseMetadataRpc, toHex } from "@talismn/scale"
import { describe, expect, it, vi } from "vitest"

import { fetchRuntimeCallResult } from "../shared"
import { fixtureHex } from "./__fixtures__"
import { fetchTokens } from "./fetchTokens"
import { getMiniMetadata } from "./getMiniMetadata"

vi.mock("../shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared")>()),
  fetchRuntimeCallResult: vi.fn(),
}))

const HOTKEY = "5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns"

const miniMetadata = getMiniMetadata({
  networkId: "bittensor",
  specVersion: 497,
  metadataRpc: fixtureHex("metadata-497.scale.gz"),
})
const { builder } = parseMetadataRpc(miniMetadata.data!)
const enabled = builder.buildStorage("SubtensorModule", "SubnetGammaEnabled")
const deposits = builder.buildStorage("SubtensorModule", "GammaDeposits")

const ENABLED_PREFIX = getStorageKeyPrefix("SubtensorModule", "SubnetGammaEnabled")
const DEPOSITS_PREFIX = getStorageKeyPrefix("SubtensorModule", "GammaDeposits")

const stubConnector = () => {
  const sent: { method: string; params: unknown[] }[] = []
  const enabledKeys = [enabled.keys.enc(25), enabled.keys.enc(30)]
  const values: Record<string, string> = {
    [enabledKeys[0]]: toHex(enabled.value.enc(true)),
    [enabledKeys[1]]: toHex(enabled.value.enc(false)),
  }
  const connector = {
    send: async (_networkId: string, method: string, params: unknown[]) => {
      sent.push({ method, params })
      if (method === "state_getKeysPaged" && params[0] === ENABLED_PREFIX) return enabledKeys
      if (method === "state_getKeysPaged" && params[0] === DEPOSITS_PREFIX)
        return [deposits.keys.enc(25, HOTKEY), deposits.keys.enc(51, HOTKEY)]
      if (method === "state_queryStorageAt")
        return [
          {
            block: "0x00",
            changes: (params[0] as string[]).map((key) => [key, values[key] ?? null]),
          },
        ]
      throw new Error(`unexpected ${method}`)
    },
  } as unknown as IChainConnectorDot
  return { connector, sent }
}

describe("substrate-gamma fetchTokens", () => {
  it("publishes enabled subnets and subnets holding deposits from one read of each", async () => {
    vi.mocked(fetchRuntimeCallResult).mockResolvedValue([
      { netuid: 25, subnet_identity: { subnet_name: new TextEncoder().encode("Mainframe") } },
      { netuid: 30, subnet_identity: { subnet_name: new TextEncoder().encode("Bettensor") } },
      null,
      { netuid: 51, subnet_identity: undefined },
    ])
    const { connector, sent } = stubConnector()

    const tokens = await fetchTokens({
      networkId: "bittensor",
      connector,
      miniMetadata,
      tokens: [{ netuid: 25, logo: "https://example.com/sn25.svg" }],
      cache: {},
    })

    expect(tokens).toEqual([
      {
        id: "bittensor:substrate-gamma:25",
        type: "substrate-gamma",
        platform: "polkadot",
        networkId: "bittensor",
        netuid: 25,
        isDefault: true,
        symbol: "γSN25",
        decimals: 9,
        name: "SN25 Mainframe credits",
        subnetName: "Mainframe",
        isTransferable: false,
        logo: "https://example.com/sn25.svg",
      },
      {
        id: "bittensor:substrate-gamma:51",
        type: "substrate-gamma",
        platform: "polkadot",
        networkId: "bittensor",
        netuid: 51,
        isDefault: true,
        symbol: "γSN51",
        decimals: 9,
        name: "SN51 credits",
        isTransferable: false,
      },
    ])
    expect(sent.map(({ method, params }) => [method, params[0]])).toEqual([
      ["state_getKeysPaged", ENABLED_PREFIX],
      ["state_getKeysPaged", DEPOSITS_PREFIX],
      ["state_queryStorageAt", [enabled.keys.enc(25), enabled.keys.enc(30)]],
    ])
    expect(vi.mocked(fetchRuntimeCallResult).mock.calls.map((call) => call.slice(3))).toEqual([
      ["SubnetInfoRuntimeApi", "get_all_dynamic_info", []],
    ])
  })
})
