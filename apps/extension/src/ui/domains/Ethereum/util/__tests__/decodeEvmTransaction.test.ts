import { BITTENSOR_BALANCE_TRANSFER_PRECOMPILE } from "@core/domains/bittensor/constants"
import {
  abiBittensorBalanceTransfer,
  abiErc20,
  abiErc1155,
  abiPermit2,
  PERMIT2_ADDRESS,
} from "@core/util/abi"
import { decodeEvmTransaction } from "@ui/domains/Ethereum/util/decodeEvmTransaction"
import { encodeFunctionData, parseAbi } from "viem"
import { describe, expect, it } from "vitest"

const OWNER = "0x1111111111111111111111111111111111111111"
const RECIPIENT = "0x00000000000000000000000000000000DeaDBeef"
const CONTRACT = "0x2222222222222222222222222222222222222222"
const TOKEN = "0x3333333333333333333333333333333333333333"

const UINT160_MAX = 2n ** 160n - 1n
const UINT48_MAX = 2 ** 48 - 1

const TOKEN_URI = "https://nft.example/{id}.json"

// bytecode makes isContractAddress() return true, chain id 1 skips the moon precompiles
const fakeClient = {
  chain: { id: 1 },
  getBytecode: async () => "0x60006000" as const,
  readContract: async ({ functionName }: { functionName: string }) => {
    switch (functionName) {
      case "uri":
        return TOKEN_URI
      case "name":
        return "Test Token"
      case "symbol":
        return "TEST"
      case "decimals":
        return 6
      default:
        throw new Error(`Unexpected read: ${functionName}`)
    }
  },
} as unknown as Parameters<typeof decodeEvmTransaction>[0]

const decode = (data: `0x${string}`, to: `0x${string}` = CONTRACT) =>
  decodeEvmTransaction(fakeClient, { to, data, value: 0n })

describe("decodeEvmTransaction", () => {
  it("decodes an ERC1155 safeTransferFrom", async () => {
    const decoded = await decode(
      encodeFunctionData({
        abi: parseAbi(abiErc1155),
        functionName: "safeTransferFrom",
        args: [OWNER, RECIPIENT, 42n, 1000n, "0x"],
      })
    )

    expect(decoded.contractType).toBe("ERC1155")
    expect(decoded.contractCall?.functionName).toBe("safeTransferFrom")
    expect(decoded.contractCall?.args).toEqual([OWNER, RECIPIENT, 42n, 1000n, "0x"])
    expect(decoded.asset?.tokenId).toBe(42n)
    // the collection-wide uri placeholder is expanded to the token id, as 64 hex characters
    expect(decoded.asset?.tokenURI).toBe(
      "https://nft.example/000000000000000000000000000000000000000000000000000000000000002a.json"
    )
  })

  it("decodes an ERC1155 safeBatchTransferFrom", async () => {
    const decoded = await decode(
      encodeFunctionData({
        abi: parseAbi(abiErc1155),
        functionName: "safeBatchTransferFrom",
        args: [OWNER, RECIPIENT, [42n, 43n], [1000n, 2000n], "0x"],
      })
    )

    expect(decoded.contractType).toBe("ERC1155")
    expect(decoded.contractCall?.functionName).toBe("safeBatchTransferFrom")
    expect(decoded.contractCall?.args).toEqual([OWNER, RECIPIENT, [42n, 43n], [1000n, 2000n], "0x"])
  })

  it("decodes a Permit2 approval, with the metadata of the token being approved", async () => {
    const data = encodeFunctionData({
      abi: parseAbi(abiPermit2),
      functionName: "approve",
      args: [TOKEN, RECIPIENT, UINT160_MAX, UINT48_MAX],
    })

    // the permit2 selector must not be mistaken for the erc20 one
    expect(data.slice(0, 10)).toBe("0x87517c45")

    const decoded = await decode(data, PERMIT2_ADDRESS)

    expect(decoded.contractType).toBe("Permit2")
    expect(decoded.contractCall?.functionName).toBe("approve")
    expect(decoded.contractCall?.args).toEqual([TOKEN, RECIPIENT, UINT160_MAX, UINT48_MAX])
    expect(decoded.asset).toEqual({
      name: "Test Token",
      symbol: "TEST",
      decimals: 6,
      tokenAddress: TOKEN,
    })
  })

  it("leaves an unknown Permit2 call undecoded rather than mislabelling it", async () => {
    const decoded = await decode("0xdeadbeef", PERMIT2_ADDRESS)

    expect(decoded.contractType).toBe("unknown")
  })

  describe("bittensor balance transfer precompile", () => {
    const DEST_PUBKEY = "0xc4518fa0ed143e016e4a1410193704924b890de8f854b94c7a6037651ec65dd0"
    const transferData = encodeFunctionData({
      abi: abiBittensorBalanceTransfer,
      functionName: "transfer",
      args: [DEST_PUBKEY],
    })
    // the precompile has no bytecode, so isContractAddress() is false on these chains
    const bittensorClient = (chainId: number) =>
      ({
        chain: { id: chainId },
        getBytecode: async () => "0x" as const,
      }) as unknown as Parameters<typeof decodeEvmTransaction>[0]

    it("decodes a transfer on Bittensor EVM without bytecode", async () => {
      const decoded = await decodeEvmTransaction(bittensorClient(964), {
        to: BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
        data: transferData,
        value: 1_000_000_000n,
      })

      expect(decoded.contractType).toBe("BittensorBalanceTransfer")
      expect(decoded.contractCall?.functionName).toBe("transfer")
      expect(decoded.contractCall?.args).toEqual([DEST_PUBKEY])
      expect(decoded.value).toBe(1_000_000_000n)
    })

    it("decodes a transfer on the Bittensor EVM testnet", async () => {
      const decoded = await decodeEvmTransaction(bittensorClient(945), {
        to: BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
        data: transferData,
        value: 0n,
      })

      expect(decoded.contractType).toBe("BittensorBalanceTransfer")
    })

    it("does not label the same call on another chain as a Bittensor transfer", async () => {
      const decoded = await decode(transferData, BITTENSOR_BALANCE_TRANSFER_PRECOMPILE)

      expect(decoded.contractType).not.toBe("BittensorBalanceTransfer")
    })

    it("leaves an unknown precompile selector undecoded", async () => {
      const decoded = await decodeEvmTransaction(bittensorClient(964), {
        to: BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
        data: "0xdeadbeef",
        value: 0n,
      })

      expect(decoded.contractType).toBe("unknown")
    })
  })

  it("still decodes an ERC20 transfer", async () => {
    const decoded = await decode(
      encodeFunctionData({
        abi: parseAbi(abiErc20),
        functionName: "transfer",
        args: [RECIPIENT, 1000n],
      })
    )

    expect(decoded.contractType).toBe("ERC20")
    expect(decoded.asset).toEqual({ name: "Test Token", symbol: "TEST", decimals: 6 })
  })
})
