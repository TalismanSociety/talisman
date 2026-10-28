import { address as solAddress } from "@solana/kit"
import { findAssociatedTokenPda } from "@solana-program/token"
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"
import { type SolToken2022Token, solToken2022TokenId } from "@talismn/chaindata-provider"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Balance } from "../../classes"
import {
  createFakeSolanaRpc,
  type SolanaRpcRequest,
} from "../sol-native/__fixtures__/fakeSolanaRpc"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() },
}))

const NETWORK_ID = "solana-mainnet"
const OWNER = "6GjquP3CKxb9G6RDsDsbMRjvomhzzeDq9twa9mS8AumL"
// a token account that isn't the owner's associated one
const OTHER_ACCOUNT = "So11111111111111111111111111111111111111112"

const PYUSD = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo"
const USDG = "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH"

const token2022 = (mintAddress: string): SolToken2022Token => ({
  id: solToken2022TokenId(NETWORK_ID, mintAddress),
  type: "sol-token2022",
  platform: "solana",
  networkId: NETWORK_ID,
  mintAddress,
  symbol: mintAddress.slice(0, 4),
  decimals: 6,
})

const associatedAccount = async (mint: string) =>
  (
    await findAssociatedTokenPda({
      mint: solAddress(mint),
      owner: solAddress(OWNER),
      tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    })
  )[0]

const tokenAccount = (pubkey: string, mint: string, amount: string, state = "initialized") => ({
  pubkey,
  account: {
    data: {
      parsed: {
        info: { mint, owner: OWNER, state, tokenAmount: { amount, decimals: 6 } },
        type: "account",
      },
      program: "spl-token-2022",
      space: 170,
    },
    executable: false,
    lamports: 2_074_080n,
    owner: TOKEN_2022_PROGRAM_ADDRESS,
    rentEpoch: 0n,
    space: 170n,
  },
})

const chain =
  (accounts: ReturnType<typeof tokenAccount>[]) =>
  ({ method, params }: SolanaRpcRequest) => {
    if (method !== "getTokenAccountsByOwner") throw new Error(`unexpected rpc method ${method}`)
    const [address] = params as [string]
    return { context: { slot: 1n }, value: address === OWNER ? accounts : [] }
  }

describe("sol-token2022 fetchBalances", () => {
  let fetchBalances: typeof import("./fetchBalances").fetchBalances

  beforeEach(async () => {
    vi.resetModules()
    ;({ fetchBalances } = await import("./fetchBalances"))
  })

  const fetch = async (accounts: ReturnType<typeof tokenAccount>[], mints: string[]) => {
    const { connector } = createFakeSolanaRpc(chain(accounts))
    const result = await fetchBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses: mints.map((mint) => [token2022(mint), [OWNER]]),
      connector,
    })
    return result.success.map((balance) => new Balance(balance))
  }

  it("sums every token account of a mint, whatever order they come in", async () => {
    const [pyusd] = await fetch(
      [
        tokenAccount(await associatedAccount(PYUSD), PYUSD, "9125532549688"),
        tokenAccount(OTHER_ACCOUNT, PYUSD, "0"),
      ],
      [PYUSD]
    )
    expect(pyusd?.total.planck).toBe(9_125_532_549_688n)
    expect(pyusd?.transferable.planck).toBe(9_125_532_549_688n)
  })

  it("locks what is outside the associated token account", async () => {
    const [usdg] = await fetch(
      [
        tokenAccount(await associatedAccount(USDG), USDG, "1000"),
        tokenAccount(OTHER_ACCOUNT, USDG, "500"),
      ],
      [USDG]
    )
    expect(usdg?.total.planck).toBe(1500n)
    expect(usdg?.transferable.planck).toBe(1000n)
  })

  it("locks a frozen associated token account", async () => {
    const [usdg] = await fetch(
      [tokenAccount(await associatedAccount(USDG), USDG, "1000", "frozen")],
      [USDG]
    )
    expect(usdg?.total.planck).toBe(1000n)
    expect(usdg?.transferable.planck).toBe(0n)
  })
})
