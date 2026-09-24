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
const BASE_GATEWAY = "0x1da2415229b614C787e145D1D7346eb496319C52" as const
const OUTBOUND_ALPHA_GATEWAY = "0xd5Fa238aa4177f6c1341491969d9cBeec94EEd69" as const
const INBOUND_ALPHA_GATEWAY = "0xcd0C6d98D0A126B1c113d15b4c28F38321437787" as const
const WTAO = "0xf3081494B87e8D5fb7960f066E931D1D0e6E3d67" as const
const BASE_SELECTOR = 15971525489660198786n
const ROBINHOOD_SELECTOR = 6180753054346818345n
const BITTENSOR_SELECTOR = 2135107236357186872n
const BASE_OFFRAMP = "0x16E577f1724AE2598F9b43a52C19E6f67eE13808" as const
const BITTENSOR_OFFRAMP = "0xF9410A08FD57e629c66E1f37a5Ae8f0a757d9AD9" as const
const BITTENSOR_LEGACY_OFFRAMP = "0x51a6150400ed9F0Ae240F5D1b15E3b45Fc4339C7" as const
const ROBINHOOD_TO_BITTENSOR_OFFRAMP = "0x0000000000000000000000000000000000000001" as const

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
  address: OUTBOUND_ALPHA_GATEWAY,
  topics: encodeEventTopics({
    abi: abiForevermoneyAlphaGateway,
    eventName: "BridgedOut",
    args: { token: WTAO, sender: SENDER, recipient: SENDER },
  }),
  data: encodeAbiParameters(
    [{ type: "uint64" }, { type: "uint256" }, { type: "bytes32" }],
    [BASE_SELECTOR, 10n ** 18n, MESSAGE_ID]
  ),
})

const claimableLog = (logIndex: number, user: `0x${string}` = SENDER) => ({
  address: INBOUND_ALPHA_GATEWAY,
  logIndex,
  topics: encodeEventTopics({
    abi: abiForevermoneyAlphaGateway,
    eventName: "Claimable",
    args: { token: WTAO, user },
  }),
  data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [10n ** 18n, 0n]),
})

const notDeliveredLog = (logIndex: number) => ({
  address: INBOUND_ALPHA_GATEWAY,
  logIndex,
  topics: encodeEventTopics({
    abi: abiForevermoneyAlphaGateway,
    eventName: "NotDelivered",
    args: { sourceChainSelector: BASE_SELECTOR, token: WTAO },
  }),
  data: encodeAbiParameters([{ type: "uint256" }, { type: "uint8" }], [10n ** 18n, 1]),
})

const executionStateChangedLog = (logIndex: number, messageId: `0x${string}`) => ({
  address: BITTENSOR_OFFRAMP,
  logIndex,
  topics: encodeEventTopics({
    abi: [abiCcipOffRamp[1]],
    eventName: "ExecutionStateChanged",
    args: { sourceChainSelector: BASE_SELECTOR, sequenceNumber: 1n, messageId },
  }),
  data: encodeAbiParameters([{ type: "uint8" }, { type: "bytes" }], [2, "0x"]),
})

type ExecutionLog = {
  address: `0x${string}`
  args: { state: number }
  transactionHash: `0x${string}`
  blockNumber: bigint
  logIndex: number
}

const execution = (state: number, blockNumber = 950n, logIndex = 5): ExecutionLog => ({
  address: BITTENSOR_OFFRAMP,
  args: { state },
  transactionHash: DELIVERY_HASH,
  blockNumber,
  logIndex,
})

type GetLogsParams = {
  address: `0x${string}`[]
  event: unknown
  fromBlock: bigint
  toBlock: bigint
}

const makeClient = (offRamps: { sourceChainSelector: bigint; offRamp: `0x${string}` }[]) => {
  const getExecutions = vi.fn(async (_: GetLogsParams): Promise<ExecutionLog[]> => [])
  const getLegacyExecutions = vi.fn(async (_: GetLogsParams): Promise<ExecutionLog[]> => [])
  return {
    getTransactionReceipt: vi.fn(),
    getBlockNumber: vi.fn(async () => 1_000n),
    readContract: vi.fn(async () => offRamps),
    getExecutions,
    getLegacyExecutions,
    getLogs: vi.fn(async (params: GetLogsParams) =>
      params.event === abiCcipOffRamp[1] ? getExecutions(params) : getLegacyExecutions(params)
    ),
  }
}

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
  base = makeClient([{ sourceChainSelector: BITTENSOR_SELECTOR, offRamp: BASE_OFFRAMP }])
  bittensor = makeClient([
    { sourceChainSelector: BASE_SELECTOR, offRamp: BITTENSOR_OFFRAMP },
    { sourceChainSelector: ROBINHOOD_SELECTOR, offRamp: ROBINHOOD_TO_BITTENSOR_OFFRAMP },
  ])
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
    expect(bittensor.getExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        address: [BITTENSOR_OFFRAMP],
        args: { sourceChainSelector: BASE_SELECTOR, messageId: MESSAGE_ID },
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
    bittensor.getExecutions.mockResolvedValue([execution(2)])
    bittensor.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })

    expect(await status(inboundTx())).toBe("finished")
    expect(bittensor.getTransactionReceipt).toHaveBeenCalledWith({ hash: DELIVERY_HASH })
  })

  it("reports a refund when the gateway booked the delivery as claimable", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getExecutions.mockResolvedValue([execution(2)])
    bittensor.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [claimableLog(3), executionStateChangedLog(5, MESSAGE_ID)],
    })

    expect(await status(inboundTx())).toBe("refunded")
  })

  it("reports a refund when the gateway reported the delivery as not delivered", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getExecutions.mockResolvedValue([execution(2)])
    bittensor.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [notDeliveredLog(3), executionStateChangedLog(5, MESSAGE_ID)],
    })

    expect(await status(inboundTx())).toBe("refunded")
  })

  it("finishes on an execution reported by a legacy OffRamp", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getLegacyExecutions.mockResolvedValue([
      { ...execution(2), address: BITTENSOR_LEGACY_OFFRAMP },
    ])
    bittensor.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })

    expect(await status(inboundTx())).toBe("finished")
  })

  it("keeps the latest execution across OffRamp versions", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getExecutions.mockResolvedValue([execution(3, 940n)])
    bittensor.getLegacyExecutions.mockResolvedValue([
      { ...execution(2, 950n), address: BITTENSOR_LEGACY_OFFRAMP },
    ])
    bittensor.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })

    expect(await status(inboundTx())).toBe("finished")
  })

  it("ignores a claim booked for another message executed in the same transaction", async () => {
    const OTHER_MESSAGE_ID = "0x4444444444444444444444444444444444444444444444444444444444444444"
    const OTHER_USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getExecutions.mockResolvedValue([execution(2, 950n, 5)])
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
    bittensor.getExecutions.mockResolvedValue([execution(3)])

    expect(await status(inboundTx())).toBe("failed")
  })

  it("finishes when a failed execution was retried successfully in a later chunk", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getBlockNumber.mockResolvedValue(3_000n)
    bittensor.getExecutions.mockImplementation(async ({ fromBlock }) =>
      fromBlock === 900n ? [execution(3, 1_000n)] : [execution(2, 2_950n)]
    )
    bittensor.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })

    expect(await status(inboundTx())).toBe("finished")
    expect(bittensor.getExecutions).toHaveBeenCalledTimes(2)
  })

  it("keeps a failed execution open and picks up a later manual retry", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    const tx = inboundTx()
    bittensor.getExecutions.mockResolvedValue([execution(3, 950n)])
    expect(await status(tx)).toBe("failed")

    bittensor.getExecutions.mockResolvedValue([])
    bittensor.getBlockNumber.mockResolvedValue(1_100n)
    expect(await status(tx)).toBe("failed")

    bittensor.getExecutions.mockResolvedValue([execution(2, 1_150n)])
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
    bittensor.getExecutions.mockResolvedValue([execution(2, 950n)])
    bittensor.getTransactionReceipt.mockRejectedValue(new Error("rpc down"))
    await expect(status(tx)).rejects.toThrow("rpc down")

    bittensor.getExecutions.mockResolvedValue([])
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

    expect(bittensor.getExecutions).toHaveBeenLastCalledWith(
      expect.objectContaining({ fromBlock: 900n })
    )
  })

  it("waits for confirmations before recording an execution", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    bittensor.getExecutions.mockResolvedValue([execution(2, 1_000n)])

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
    bittensor.getExecutions.mockResolvedValue([execution(2, 998n)])
    bittensor.getTransactionReceipt.mockResolvedValue({ status: "success", logs: [] })
    expect(await status(tx)).toBe("finished")
    expect(bittensor.getExecutions).toHaveBeenLastCalledWith(
      expect.objectContaining({ fromBlock: 989n, toBlock: 1_005n })
    )
  })

  it("drops an unconfirmed execution that disappeared in a reorg", async () => {
    base.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedToFinneyLog()],
    })
    const tx = inboundTx()
    bittensor.getExecutions.mockResolvedValue([execution(2, 1_000n)])
    expect(await status(tx)).toBe("verifying")

    bittensor.getBlockNumber.mockResolvedValue(1_010n)
    bittensor.getExecutions.mockResolvedValue([])
    expect(await status(tx)).toBe("exchanging")
  })

  it("finishes an outbound bridge from the spoke OffRamp without a claimable check", async () => {
    bittensor.getTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [bridgedOutLog()],
    })
    base.getExecutions.mockResolvedValue([execution(2)])

    expect(await status(outboundTx())).toBe("finished")
    expect(base.getExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        address: [BASE_OFFRAMP],
        args: { sourceChainSelector: BITTENSOR_SELECTOR, messageId: MESSAGE_ID },
      })
    )
    expect(base.getTransactionReceipt).not.toHaveBeenCalled()
  })
})
