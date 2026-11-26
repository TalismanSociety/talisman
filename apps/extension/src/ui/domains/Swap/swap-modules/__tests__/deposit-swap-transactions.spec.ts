import type { Network } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/crypto"
import type { PublicClient } from "viem"
import { describe, expect, it, vi } from "vitest"

import type { SwapModuleTransaction } from "../common.swap-module"
import {
  buildDepositTransaction,
  type DepositSwapAsset,
  type DepositTransactionParams,
  type DepositTransactionsEnv,
  resolveDepositAddress,
} from "../deposit-swap-transactions"

const EVM_FROM = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const EVM_DEPOSIT = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const SUB_FROM = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
// a generic (prefix 42) encoding, as a provider may hand it back
const SUB_DEPOSIT = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const SUB_DEPOSIT_PREFIX0 = encodeAnyAddress(SUB_DEPOSIT, { ss58Format: 0 })
const SOL_DEPOSIT = "So11111111111111111111111111111111111111112"

const POLKADOT = { id: "polkadot", platform: "polkadot", prefix: 0, account: "*25519" }
const MOONBEAM = { id: "moonbeam", platform: "polkadot", prefix: 1284, account: "secp256k1" }

/** prepareTransactionRequest echoes its request; buildSubstrateDeposit hands back what it got */
const makeEnv = () => {
  const prepareTransactionRequest = vi.fn(async (request: unknown) => request)
  const buildSubstrateDeposit = vi.fn(
    async ({ deposit }: DepositTransactionParams) =>
      ({ platform: "polkadot", deposit }) as unknown as SwapModuleTransaction
  )
  const env = {
    getNetworksMap: async (platform?: string) =>
      platform === "polkadot"
        ? { polkadot: POLKADOT, moonbeam: MOONBEAM }
        : { "1": { id: "1", platform: "ethereum", nativeTokenId: "1:evm-native" } },
    getToken: async () => null,
    findEvmClient: async () => ({ prepareTransactionRequest }) as unknown as PublicClient,
    estimateSubstrateDepositFee: async () => null,
    buildSubstrateDeposit,
  } as unknown as DepositTransactionsEnv
  return { env, prepareTransactionRequest, buildSubstrateDeposit }
}

const params = (
  fromAsset: DepositSwapAsset,
  depositAddress: string,
  fromAddress: string
): DepositTransactionParams => ({
  fromAsset,
  fromAddress,
  deposit: { depositAddress, depositAmount: "1" },
  context: { platform: fromAsset.platform } as DepositTransactionParams["context"],
})

const ETH: DepositSwapAsset = { chainId: "1", platform: "ethereum", decimals: 18 }
const USDT: DepositSwapAsset = {
  chainId: "1",
  platform: "ethereum",
  contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  decimals: 6,
}
const DOT: DepositSwapAsset = { chainId: "polkadot", platform: "polkadot", decimals: 10 }
const GLMR: DepositSwapAsset = { chainId: "moonbeam", platform: "polkadot", decimals: 18 }

describe("buildDepositTransaction deposit address", () => {
  it("sends an EVM deposit to the provider's address", async () => {
    const { env } = makeEnv()

    await expect(
      buildDepositTransaction(env, params(ETH, EVM_DEPOSIT, EVM_FROM))
    ).resolves.toMatchObject({ platform: "ethereum", transaction: { to: EVM_DEPOSIT } })
  })

  it("refuses a deposit address that is not an address", async () => {
    const { env, prepareTransactionRequest } = makeEnv()

    await expect(
      buildDepositTransaction(env, params(ETH, "not-an-address", EVM_FROM))
    ).rejects.toThrow("Invalid deposit address from provider")
    expect(prepareTransactionRequest).not.toHaveBeenCalled()
  })

  it("refuses a substrate or Solana deposit address for an EVM asset, native or ERC-20", async () => {
    const { env, prepareTransactionRequest } = makeEnv()

    await expect(buildDepositTransaction(env, params(ETH, SUB_DEPOSIT, EVM_FROM))).rejects.toThrow(
      "Invalid deposit address from provider"
    )
    await expect(buildDepositTransaction(env, params(USDT, SOL_DEPOSIT, EVM_FROM))).rejects.toThrow(
      "Invalid deposit address from provider"
    )
    expect(prepareTransactionRequest).not.toHaveBeenCalled()
  })

  it("hands a substrate deposit over re-encoded to the network's ss58 prefix", async () => {
    const { env, buildSubstrateDeposit } = makeEnv()

    await buildDepositTransaction(env, params(DOT, SUB_DEPOSIT, SUB_FROM))

    expect(buildSubstrateDeposit).toHaveBeenCalledWith(
      expect.objectContaining({
        deposit: { depositAddress: SUB_DEPOSIT_PREFIX0, depositAmount: "1" },
      })
    )
  })

  it("refuses an EVM deposit address on an sr25519 network", async () => {
    const { env, buildSubstrateDeposit } = makeEnv()

    await expect(buildDepositTransaction(env, params(DOT, EVM_DEPOSIT, SUB_FROM))).rejects.toThrow(
      "Invalid deposit address from provider"
    )
    expect(buildSubstrateDeposit).not.toHaveBeenCalled()
  })

  it("hands an H160 deposit address on a secp256k1 network over unchanged", async () => {
    const { env, buildSubstrateDeposit } = makeEnv()

    await buildDepositTransaction(env, params(GLMR, EVM_DEPOSIT, EVM_FROM))

    expect(buildSubstrateDeposit).toHaveBeenCalledWith(
      expect.objectContaining({ deposit: { depositAddress: EVM_DEPOSIT, depositAmount: "1" } })
    )
  })

  it("refuses a substrate deposit on an unknown network", async () => {
    const { env } = makeEnv()

    await expect(
      buildDepositTransaction(
        env,
        params({ chainId: "unknown", platform: "polkadot", decimals: 10 }, SUB_DEPOSIT, SUB_FROM)
      )
    ).rejects.toThrow("Network not supported")
  })
})

describe("resolveDepositAddress", () => {
  const polkadot = POLKADOT as Network

  it("passes EVM and Solana addresses through for their own platform", () => {
    expect(resolveDepositAddress({ platform: "ethereum" }, EVM_DEPOSIT, undefined)).toBe(
      EVM_DEPOSIT
    )
    expect(resolveDepositAddress({ platform: "solana" }, SOL_DEPOSIT, undefined)).toBe(SOL_DEPOSIT)
  })

  it("refuses every cross-platform combination", () => {
    const cases = [
      ["ethereum", SOL_DEPOSIT],
      ["ethereum", SUB_DEPOSIT],
      ["solana", EVM_DEPOSIT],
      ["solana", SUB_DEPOSIT],
    ] as const
    for (const [platform, address] of cases)
      expect(() => resolveDepositAddress({ platform }, address, undefined)).toThrow(
        "Invalid deposit address from provider"
      )
    expect(() => resolveDepositAddress({ platform: "polkadot" }, SOL_DEPOSIT, polkadot)).toThrow(
      "Invalid deposit address from provider"
    )
  })

  it("re-encodes ss58 to the network prefix and leaves a matching encoding alone", () => {
    expect(resolveDepositAddress({ platform: "polkadot" }, SUB_DEPOSIT, polkadot)).toBe(
      SUB_DEPOSIT_PREFIX0
    )
    expect(resolveDepositAddress({ platform: "polkadot" }, SUB_DEPOSIT_PREFIX0, polkadot)).toBe(
      SUB_DEPOSIT_PREFIX0
    )
  })

  it("refuses an empty or malformed string", () => {
    expect(() => resolveDepositAddress({ platform: "ethereum" }, "", undefined)).toThrow(
      "Invalid deposit address from provider"
    )
    expect(() => resolveDepositAddress({ platform: "ethereum" }, "0x1234", undefined)).toThrow(
      "Invalid deposit address from provider"
    )
  })
})
