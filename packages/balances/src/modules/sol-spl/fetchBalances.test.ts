import { AccountRole } from "@solana/kit"
import { type SolSplToken, solSplTokenId } from "@talismn/chaindata-provider"
import { uniq } from "lodash-es"
import { firstValueFrom } from "rxjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { IBalance } from "../../types"
import {
  createFakeSolanaRpc,
  NodeUnhealthyError,
  type SolanaRpcRequest,
} from "../sol-native/__fixtures__/fakeSolanaRpc"
import { solanaMainnet as fixture } from "./__fixtures__/solanaMainnet"
import { getTransferCallData } from "./getTransferCallData"
import { fetchOnChainTokenData } from "./onChainTokenMetadata"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() },
}))

const NETWORK_ID = "solana-mainnet"
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
const SYSTEM_PROGRAM = "11111111111111111111111111111111"

const OWNER = fixture.owner
const RECIPIENT = fixture.expected.recipient

const WSOL = "So11111111111111111111111111111111111111112"
const USD1 = "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB"
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
const RAY = fixture.expected.dynamicToken.mint
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
const JUP = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"
const MSOL = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"

const splToken = (mintAddress: string): SolSplToken => ({
  id: solSplTokenId(NETWORK_ID, mintAddress),
  type: "sol-spl",
  platform: "solana",
  networkId: NETWORK_ID,
  mintAddress,
  symbol: mintAddress.slice(0, 4),
  decimals: 6,
})

const recordedAccounts = fixture.rpc.getTokenAccountsByOwner.result
type TokenAccount = (typeof recordedAccounts.value)[number]

/** independently decoded amounts (raw account bytes) of the owner's accounts for a mint */
const amountsOf = (mint: string) =>
  fixture.expected.tokenAccounts.filter((a) => a.mint === mint).map((a) => BigInt(a.amount))

const withMint = (account: TokenAccount, mint: string): TokenAccount => {
  const copy = structuredClone(account)
  copy.account.data.parsed.info.mint = mint
  return copy
}

type Chain = {
  /** token accounts by owner, defaults to the recorded accounts for the fixture owner and none otherwise */
  tokenAccounts?: Record<string, TokenAccount[]>
  accounts?: Record<string, unknown>
  failingOwners?: string[]
}

const recordedChain =
  ({ tokenAccounts, accounts = {}, failingOwners = [] }: Chain = {}) =>
  ({ method, params }: SolanaRpcRequest) => {
    const [address] = params as [string]
    switch (method) {
      case "getTokenAccountsByOwner":
        if (failingOwners.includes(address)) throw new NodeUnhealthyError()
        return {
          ...recordedAccounts,
          value: tokenAccounts?.[address] ?? (address === OWNER ? recordedAccounts.value : []),
        }
      case "getAccountInfo": {
        const recorded: Record<string, unknown> = {
          [RAY]: fixture.rpc.mintAccount.result,
          [fixture.expected.dynamicToken.metadataPda]: fixture.rpc.metadataAccount.result,
        }
        return accounts[address] ?? recorded[address] ?? { ...recordedAccounts, value: null }
      }
      default:
        throw new Error(`unexpected rpc method ${method}`)
    }
  }

const liveBalance = (mint: string, value: bigint | string, address = OWNER): IBalance => ({
  tokenId: solSplTokenId(NETWORK_ID, mint),
  networkId: NETWORK_ID,
  address,
  source: "sol-spl",
  status: "live",
  value: value.toString(),
})

const sum = (values: bigint[]) => values.reduce((a, b) => a + b, 0n)

const accountInfoRequests = (requests: SolanaRpcRequest[]) =>
  requests.filter((r) => r.method === "getAccountInfo").map((r) => r.params[0])

describe("sol-spl fetchBalances", () => {
  let fetchBalances: typeof import("./fetchBalances").fetchBalances
  let getDetectedTokensIds$: typeof import("../shared/detectedTokens").getDetectedTokensIds$

  // the metaplex metadata cache and detected tokens live at module level
  beforeEach(async () => {
    vi.resetModules()
    ;({ fetchBalances } = await import("./fetchBalances"))
    ;({ getDetectedTokensIds$ } = await import("../shared/detectedTokens"))
  })

  it("reads token accounts by owner and reports zero for mints without an account", async () => {
    const { connector, requests } = createFakeSolanaRpc(recordedChain())

    const result = await fetchBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses: [USDT, RAY, BONK, USDC, USD1, WSOL].map((mint) => [
        splToken(mint),
        [OWNER],
      ]),
      connector,
    })

    expect(result.success.slice(0, 3)).toEqual([
      liveBalance(USDT, sum(amountsOf(USDT))),
      liveBalance(RAY, sum(amountsOf(RAY))),
      liveBalance(BONK, 0n),
    ])
    expect(result.success.map((b) => b.tokenId)).toEqual(
      [USDT, RAY, BONK, USDC, USD1, WSOL].map((mint) => solSplTokenId(NETWORK_ID, mint))
    )
    expect(result.errors).toEqual([])
    expect(result.dynamicTokens).toEqual([])
    expect(requests).toEqual([
      {
        method: "getTokenAccountsByOwner",
        params: [
          OWNER,
          { programId: TOKEN_PROGRAM },
          { encoding: "jsonParsed", commitment: "confirmed" },
        ],
      },
    ])
  })

  it("sums every token account the owner holds for the same mint", async () => {
    const { connector } = createFakeSolanaRpc(recordedChain())

    const result = await fetchBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses: [USDC, USD1, WSOL, RAY, USDT].map((mint) => [splToken(mint), [OWNER]]),
      connector,
    })

    expect(result.success.slice(0, 3)).toEqual([
      liveBalance(USDC, sum(amountsOf(USDC))),
      liveBalance(USD1, sum(amountsOf(USD1))),
      liveBalance(WSOL, sum(amountsOf(WSOL))),
    ])
  })

  it("queries each owner once and maps balances back to their owner", async () => {
    const { connector, requests } = createFakeSolanaRpc(recordedChain())

    const result = await fetchBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses: [
        [splToken(USDT), [RECIPIENT.owner, OWNER]],
        [splToken(RAY), [OWNER, RECIPIENT.owner]],
      ],
      connector,
    })

    expect(result.success).toEqual([
      liveBalance(USDT, 0n, RECIPIENT.owner),
      liveBalance(USDT, sum(amountsOf(USDT))),
      liveBalance(RAY, sum(amountsOf(RAY))),
      liveBalance(RAY, 0n, RECIPIENT.owner),
    ])
    expect(
      requests.filter((r) => r.method === "getTokenAccountsByOwner").map((r) => r.params[0])
    ).toEqual([RECIPIENT.owner, OWNER])
  })

  it("registers a held mint missing from chaindata as a dynamic token, once", async () => {
    const { connector, requests } = createFakeSolanaRpc(recordedChain())
    const request = {
      networkId: NETWORK_ID,
      tokensWithAddresses: [USDC, USD1, WSOL, USDT].map((mint): [SolSplToken, string[]] => [
        splToken(mint),
        [OWNER],
      ]),
      connector,
    }

    const result = await fetchBalances(request)

    expect(result.dynamicTokens).toEqual([
      {
        id: solSplTokenId(NETWORK_ID, RAY),
        type: "sol-spl",
        platform: "solana",
        networkId: NETWORK_ID,
        mintAddress: RAY,
        isDefault: true,
        symbol: "RAY",
        name: "Raydium",
        decimals: fixture.expected.dynamicToken.decimals,
      },
    ])
    expect(result.success.at(-1)).toEqual(liveBalance(RAY, sum(amountsOf(RAY))))
    expect(result.success).toHaveLength(5)
    expect(accountInfoRequests(requests)).toEqual([RAY, fixture.expected.dynamicToken.metadataPda])

    // metadata is cached: the next poll registers the token again without refetching it
    const again = await fetchBalances(request)
    expect(again.dynamicTokens).toEqual(result.dynamicTokens)
    expect(accountInfoRequests(requests)).toHaveLength(2)
  })

  it("does not look up metadata of an unknown mint with a zero balance", async () => {
    const [emptyAccount] = recordedAccounts.value.filter(
      (a) => a.account.data.parsed.info.tokenAmount.amount === "0"
    )
    if (!emptyAccount) throw new Error("fixture has no empty token account")
    const usdt = recordedAccounts.value.filter((a) => a.account.data.parsed.info.mint === USDT)
    // a mint no other test looks up, so the module's metadata cache cannot hide a lookup
    const { connector, requests } = createFakeSolanaRpc(
      recordedChain({ tokenAccounts: { [OWNER]: [withMint(emptyAccount, MSOL), ...usdt] } })
    )

    const result = await fetchBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses: [[splToken(USDT), [OWNER]]],
      connector,
    })

    expect(result.success).toEqual([liveBalance(USDT, sum(amountsOf(USDT)))])
    expect(result.dynamicTokens).toEqual([])
    expect(accountInfoRequests(requests)).toEqual([])
  })

  it("ignores an unknown mint without metaplex metadata", async () => {
    const [rayAccount] = recordedAccounts.value.filter(
      (a) => a.account.data.parsed.info.mint === RAY
    )
    if (!rayAccount) throw new Error("fixture has no RAY account")
    const { connector, requests } = createFakeSolanaRpc(
      recordedChain({
        tokenAccounts: { [OWNER]: [withMint(rayAccount, JUP)] },
        accounts: { [JUP]: fixture.rpc.mintAccount.result },
      })
    )
    const request = {
      networkId: NETWORK_ID,
      tokensWithAddresses: [[splToken(USDT), [OWNER]]] as [SolSplToken, string[]][],
      connector,
    }

    const result = await fetchBalances(request)

    expect(result.success).toEqual([liveBalance(USDT, 0n)])
    expect(result.dynamicTokens).toEqual([])
    expect(accountInfoRequests(requests)).toHaveLength(2)

    // the invalid mint is cached too
    await fetchBalances(request)
    expect(accountInfoRequests(requests)).toHaveLength(2)
  })

  it("publishes the mints the owner holds as detected tokens", async () => {
    const { connector } = createFakeSolanaRpc(recordedChain())

    await fetchBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses: [[splToken(USDT), [OWNER]]],
      connector,
    })

    expect(uniq(await firstValueFrom(getDetectedTokensIds$(OWNER)))).toEqual(
      [WSOL, USD1, RAY, USDC, USDT].map((mint) => solSplTokenId(NETWORK_ID, mint)).sort()
    )
  })

  it("rejects the whole fetch when one owner's token accounts cannot be read", async () => {
    const { connector } = createFakeSolanaRpc(recordedChain({ failingOwners: [RECIPIENT.owner] }))

    await expect(
      fetchBalances({
        networkId: NETWORK_ID,
        tokensWithAddresses: [[splToken(USDT), [OWNER, RECIPIENT.owner]]],
        connector,
      })
    ).rejects.toThrow("Node is unhealthy; behind by 42 slots")
  })

  it("rejects the whole fetch for an address that is not a solana address", async () => {
    const { connector } = createFakeSolanaRpc(recordedChain())

    await expect(
      fetchBalances({
        networkId: NETWORK_ID,
        tokensWithAddresses: [
          [splToken(USDT), [OWNER, "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]],
        ],
        connector,
      })
    ).rejects.toThrow("Invalid value 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 for base 58")
  })
})

describe("sol-spl fetchOnChainTokenData", () => {
  it("reads decimals from the mint and symbol and name from metaplex metadata", async () => {
    const { connector } = createFakeSolanaRpc(recordedChain())

    await expect(fetchOnChainTokenData(connector, solSplTokenId(NETWORK_ID, RAY))).resolves.toEqual(
      {
        id: solSplTokenId(NETWORK_ID, RAY),
        isValid: true,
        symbol: "RAY",
        name: "Raydium",
        decimals: fixture.expected.dynamicToken.decimals,
      }
    )
  })

  it("marks a mint that does not exist as invalid", async () => {
    const { connector } = createFakeSolanaRpc(recordedChain())

    await expect(
      fetchOnChainTokenData(connector, solSplTokenId(NETWORK_ID, BONK))
    ).resolves.toEqual({ id: solSplTokenId(NETWORK_ID, BONK), isValid: false })
  })

  it("returns null when the node fails", async () => {
    const { connector } = createFakeSolanaRpc(() => {
      throw new NodeUnhealthyError()
    })

    await expect(fetchOnChainTokenData(connector, solSplTokenId(NETWORK_ID, RAY))).resolves.toBe(
      null
    )
  })
})

describe("sol-spl getTransferCallData", () => {
  const tokenAccount = (owner: string) => ({
    ...recordedAccounts,
    value: {
      owner,
      lamports: 2039280,
      executable: false,
      rentEpoch: 0,
      space: 0,
      data: ["", "base64"],
    },
  })
  const SENDER_ATA = fixture.expected.tokenAccounts.find(
    (a) => a.mint === USDC && a.isAssociated
  )?.pubkey

  const transfer = (accounts: Chain["accounts"], to = RECIPIENT.owner) => {
    const rpc = createFakeSolanaRpc(recordedChain({ accounts }))
    return {
      requests: rpc.requests,
      instructions: getTransferCallData({
        from: OWNER,
        to,
        value: "2500000",
        token: splToken(USDC),
        connector: rpc.connector,
      }),
    }
  }

  // TokenInstruction::Transfer = u8 3, then the u64 LE amount
  const transferData = new Uint8Array([3, 0xa0, 0x25, 0x26, 0, 0, 0, 0, 0])

  it("transfers between the associated token accounts when the recipient's exists", async () => {
    const { instructions, requests } = transfer({
      [RECIPIENT.associatedTokenAccount]: tokenAccount(TOKEN_PROGRAM),
    })

    const [instruction, ...others] = await instructions

    expect(others).toEqual([])
    expect(instruction?.programAddress).toBe(TOKEN_PROGRAM)
    expect(instruction?.accounts?.map(({ address, role }) => [address, role])).toEqual([
      [SENDER_ATA, AccountRole.WRITABLE],
      [RECIPIENT.associatedTokenAccount, AccountRole.WRITABLE],
      // a bare address, not a signer: the sender signs as the transaction's fee payer
      [OWNER, AccountRole.READONLY],
    ])
    expect(instruction?.data).toEqual(transferData)
    expect(requests).toEqual([
      {
        method: "getAccountInfo",
        params: [
          RECIPIENT.associatedTokenAccount,
          { encoding: "base64", dataSlice: { offset: 0, length: 0 }, commitment: "confirmed" },
        ],
      },
    ])
  })

  it.each([
    ["does not exist", null],
    ["is a rent-dusted system account", tokenAccount(SYSTEM_PROGRAM)],
  ])("creates the recipient's associated token account when it %s", async (_, account) => {
    const { instructions } = transfer(
      account ? { [RECIPIENT.associatedTokenAccount]: account } : {}
    )

    const [create, send, ...others] = await instructions

    expect(others).toEqual([])
    expect(create?.programAddress).toBe(ATA_PROGRAM)
    expect(create?.accounts?.slice(0, 4).map(({ address, role }) => [address, role])).toEqual([
      [OWNER, AccountRole.WRITABLE_SIGNER],
      [RECIPIENT.associatedTokenAccount, AccountRole.WRITABLE],
      [RECIPIENT.owner, AccountRole.READONLY],
      [USDC, AccountRole.READONLY],
    ])
    expect(send?.programAddress).toBe(TOKEN_PROGRAM)
    expect(send?.data).toEqual(transferData)
  })

  it("rejects an off-curve (program-derived) recipient", async () => {
    const { instructions } = transfer({}, fixture.expected.dynamicToken.metadataPda)

    await expect(instructions).rejects.toThrow("program-derived (off-curve)")
  })
})
