import { encodeAbiParameters, encodeEventTopics } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockClients } = vi.hoisted(() => ({
  mockClients: new Map<string, Record<string, ReturnType<typeof vi.fn>>>(),
}))

vi.mock("../../rpcs/chain-connector-evm", () => ({
  chainConnectorEvm: {
    getPublicClientForEvmNetwork: vi.fn(async (id: string) => mockClients.get(id) ?? null),
  },
}))

import type { WalletTransactionEth } from "../transactions/types"
import { abiCcipOffRamp, abiForevermoneyAlphaGateway, abiForevermoneySpokeGateway } from "./abi"
import { fetchForevermoneyStatus } from "./deliveryStatus"

// the watcher remembers scanned blocks per transaction id, so each test gets its own id
let txCounter = 0
const nextHash = () => `0x${(++txCounter).toString(16).padStart(64, "0")}` as const
let HASH = nextHash()
const DELIVERY_HASH = "0x2222222222222222222222222222222222222222222222222222222222222222" as const
const MESSAGE_ID = "0x3333333333333333333333333333333333333333333333333333333333333333" as const
const SENDER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const
const BASE_GATEWAY = "0x5EF3d7D19e4b233a1A169DA0d5CB02ec6b160a2C" as const
const ALPHA_GATEWAY = "0x998f20Fea90bF7792774dECc7f994716442B1705" as const
const WTAO = "0xf3081494B87e8D5fb7960f066E931D1D0e6E3d67" as const
const BASE_OFFRAMP = "0xf09AFe78d3c7d359b334d7cB88995751F7eC5E13"
const BITTENSOR_OFFRAMP = "0x51a6150400ed9F0Ae240F5D1b15E3b45Fc4339C7"

const bridgedToFinneyLog = () => ({
  address: BASE_GATEWAY,
  topics: encodeEventTopics({
    abi: abiForevermoneySpokeGateway,
    eventName: "BridgedToFinney",
    args: { token: WTAO, sender: SENDER, ss58: MESSAGE_ID },
  }),
  data: encodeAbiParameters([{ type: "uint256" }, { type: "bytes32" }], [10n ** 18n, MESSAGE_ID]),
})

const bridgedOutLog = () => ({
  address: ALPHA_GATEWAY,
  topics: encodeEventTopics({
    abi: abiForevermoneyAlphaGateway,
    eventName: "BridgedOut",
    args: { token: WTAO, sender: SENDER, recipient: SENDER },
  }),
  data: encodeAbiParameters(
    [{ type: "uint64" }, { type: "uint256" }, { type: "bytes32" }],
    [15971525489660198786n, 10n ** 18n, MESSAGE_ID]
  ),
})

const claimableLog = (logIndex: number, user: `0x${string}` = SENDER) => ({
  address: ALPHA_GATEWAY,
  logIndex,
  topics: encodeEventTopics({
    abi: abiForevermoneyAlphaGateway,
    eventName: "Claimable",
    args: { token: WTAO, user },
  }),
  data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [10n ** 18n, 0n]),
})

const executionStateChangedLog = (logIndex: number, messageId: `0x${string}`) => ({
  address: BITTENSOR_OFFRAMP,
  logIndex,
  topics: encodeEventTopics({
    abi: abiCcipOffRamp,
    eventName: "ExecutionStateChanged",
    args: { sourceChainSelector: 15971525489660198786n, sequenceNumber: 1n, messageId },
  }),
  data: encodeAbiParameters(
    [{ type: "bytes32" }, { type: "uint8" }, { type: "bytes" }, { type: "uint256" }],
    [messageId, 2, "0x", 0n]
  ),
})

type ExecutionLog = {
  args: { state: number }
  transactionHash: `0x${string}`
  blockNumber: bigint
  logIndex: number
}

const execution = (state: number, blockNumber = 950n, logIndex = 5): ExecutionLog => ({
  args: { state },
  transactionHash: DELIVERY_HASH,
  blockNumber,
  logIndex,
})

const makeClient = () => ({
  getTransactionReceipt: vi.fn(),
  getBlockNumber: vi.fn(async () => 1_000n),
  getLogs: vi.fn(async (_: { fromBlock: bigint; toBlock: bigint }): Promise<ExecutionLog[]> => []),
})

const inboundTx = (): WalletTransactionEth => ({
  id: HASH,
  platform: "ethereum",
  networkId: "8453",
  account: SENDER,
  status: "success",
  confirmed: true,
  payload: {},
  hash: HASH,
  nonce: 1,
  timestamp: Date.now(),
  txInfo: {
    type: "swap-forevermoney",
    fromTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
    toTokenId: "bittensor:substrate-native",
    fromAmount: "1000000000000000000",
    toAmount: "1000000000",
    to: "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu",
    destinationStartBlock: "900",
  },
})

const outboundTx = (): WalletTransactionEth => ({
  ...inboundTx(),
  networkId: "964",
  txInfo: {
    type: "swap-forevermoney",
    fromTokenId: "964:evm-native",
    toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
    fromAmount: "1000000000000000000",
    toAmount: "1000000000000000000",
    to: SENDER,
    destinationStartBlock: "900",
  },
})

const status = (tx: WalletTransactionEth) =>
  fetchForevermoneyStatus(tx, tx.txInfo as Extract<typeof tx.txInfo, { type: "swap-forevermoney" }>)

let base: ReturnType<typeof makeClient>
let bittensor: ReturnType<typeof makeClient>

beforeEach(() => {
  vi.clearAllMocks()
  HASH = nextHash()
  base = makeClient()
  bittensor = makeClient()
  mockClients.set("8453", base)
  mockClients.set("964", bittensor)
})

describe("fetchForevermoneyStatus", () => {
  it("keeps confirming until the source receipt exists", async () => {
    base.getTransactionReceipt.mockRejectedValue(new Error("not found"))

    expect(await status(inboundTx())).toBe("confirming")
  })

  it("fails when the source transaction reverted", async () => {
    base.getTransactionReceipt.mockResolvedValue({ status: "reverted", logs: [] })

    expect(await status(inboundTx())).toBe("failed")
  })

  it("is invalid when the gateway emitted no message", async () => {
    base.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })

    expect(await status(inboundTx())).toBe("invalid")
  })

  it("stays exchanging while the destination OffRamp has not executed the message", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })

    expect(await status(inboundTx())).toBe("exchanging")
    expect(bittensor.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: BITTENSOR_OFFRAMP,
        args: { sourceChainSelector: 15971525489660198786n, messageId: MESSAGE_ID },
        fromBlock: 900n,
        toBlock: 1_000n,
      })
    )
  })

  it("gives up after a day without delivery", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })

    expect(await status({ ...inboundTx(), timestamp: Date.now() - 25 * 60 * 60 * 1000 })).toBe(
      "unknown"
    )
  })

  it("finishes an inbound bridge once delivered", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getLogs.mockResolvedValue([execution(2)])
    bittensor.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })

    expect(await status(inboundTx())).toBe("finished")
    expect(bittensor.getTransactionReceipt).toHaveBeenCalledWith({ hash: DELIVERY_HASH })
  })

  it("reports a refund when the gateway booked the delivery as claimable", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getLogs.mockResolvedValue([execution(2)])
    bittensor.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [claimableLog(3), executionStateChangedLog(5, MESSAGE_ID)],
    })

    expect(await status(inboundTx())).toBe("refunded")
  })

  it("ignores a claim booked for another message executed in the same transaction", async () => {
    const OTHER_MESSAGE_ID = "0x4444444444444444444444444444444444444444444444444444444444444444"
    const OTHER_USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getLogs.mockResolvedValue([execution(2, 950n, 5)])
    bittensor.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [
        claimableLog(1, OTHER_USER),
        executionStateChangedLog(2, OTHER_MESSAGE_ID),
        executionStateChangedLog(5, MESSAGE_ID),
        claimableLog(7, OTHER_USER),
        executionStateChangedLog(8, OTHER_MESSAGE_ID),
      ],
    })

    expect(await status(inboundTx())).toBe("finished")
  })

  it("fails when CCIP execution failed", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getLogs.mockResolvedValue([execution(3)])

    expect(await status(inboundTx())).toBe("failed")
  })

  it("finishes when a failed execution was retried successfully in a later chunk", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getBlockNumber.mockResolvedValue(3_000n)
    bittensor.getLogs.mockImplementation(async ({ fromBlock }) =>
      fromBlock === 900n ? [execution(3, 1_000n)] : [execution(2, 2_950n)]
    )
    bittensor.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })

    expect(await status(inboundTx())).toBe("finished")
    expect(bittensor.getLogs).toHaveBeenCalledTimes(2)
  })

  it("keeps a failed execution open and picks up a later manual retry", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    const tx = inboundTx()
    bittensor.getLogs.mockResolvedValue([execution(3, 950n)])
    expect(await status(tx)).toBe("failed")

    bittensor.getLogs.mockResolvedValue([])
    bittensor.getBlockNumber.mockResolvedValue(1_100n)
    expect(await status(tx)).toBe("failed")

    bittensor.getLogs.mockResolvedValue([execution(2, 1_150n)])
    bittensor.getBlockNumber.mockResolvedValue(1_200n)
    bittensor.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })
    expect(await status(tx)).toBe("finished")
  })

  it("keeps the scan when the claimable check fails", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    const tx = inboundTx()
    bittensor.getLogs.mockResolvedValue([execution(2, 950n)])
    bittensor.getTransactionReceipt.mockRejectedValue(new Error("rpc down"))
    await expect(status(tx)).rejects.toThrow("rpc down")

    bittensor.getLogs.mockResolvedValue([])
    bittensor.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })
    expect(await status(tx)).toBe("finished")
  })

  it("releases the scan once the delivery window closed", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    const tx = { ...inboundTx(), timestamp: Date.now() - 25 * 60 * 60 * 1_000 }
    expect(await status(tx)).toBe("unknown")
    expect(await status(tx)).toBe("unknown")

    expect(bittensor.getLogs).toHaveBeenLastCalledWith(expect.objectContaining({ fromBlock: 900n }))
  })

  it("waits for confirmations before recording an execution", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getLogs.mockResolvedValue([execution(2, 1_000n)])

    expect(await status(inboundTx())).toBe("verifying")
    expect(bittensor.getTransactionReceipt).not.toHaveBeenCalled()
  })

  it("re-reads the reorg window on the next poll", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    const tx = inboundTx()
    expect(await status(tx)).toBe("exchanging")

    bittensor.getBlockNumber.mockResolvedValue(1_005n)
    bittensor.getLogs.mockResolvedValue([execution(2, 998n)])
    bittensor.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })
    expect(await status(tx)).toBe("finished")
    expect(bittensor.getLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ fromBlock: 989n, toBlock: 1_005n })
    )
  })

  it("drops an unconfirmed execution that disappeared in a reorg", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    const tx = inboundTx()
    bittensor.getLogs.mockResolvedValue([execution(2, 1_000n)])
    expect(await status(tx)).toBe("verifying")

    bittensor.getBlockNumber.mockResolvedValue(1_010n)
    bittensor.getLogs.mockResolvedValue([])
    expect(await status(tx)).toBe("exchanging")
  })

  it("finishes an outbound bridge from the spoke OffRamp without a claimable check", async () => {
    bittensor.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedOutLog()],
    })
    base.getLogs.mockResolvedValue([execution(2)])

    expect(await status(outboundTx())).toBe("finished")
    expect(base.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: BASE_OFFRAMP,
        args: { sourceChainSelector: 2135107236357186872n, messageId: MESSAGE_ID },
      })
    )
    expect(base.getTransactionReceipt).not.toHaveBeenCalled()
  })
})
