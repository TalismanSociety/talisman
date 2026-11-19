import {
  getAddress,
  type Hex,
  parseTransaction,
  recoverMessageAddress,
  recoverTransactionAddress,
  recoverTypedDataAddress,
  type TransactionSerialized,
  toHex,
} from "viem"

import { expect, test } from "../fixtures"
import { ANVIL, anvilRpc, startAnvil, stopAnvil } from "./chains"
import { launcher } from "./emulator"
import {
  type DappCall,
  dappResult,
  emulatorStopped,
  type LedgerDappWindow,
  ledgerSuite,
  rejectedOnDevice,
  requestFromDapp,
  type Session,
  type SigningCase,
  wrongAppOpen,
} from "./suite"

type EthereumWindow = Window & {
  talismanEth?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
}

const RECIPIENT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
const GWEI = 10n ** 9n
const ETHER = 10n ** 18n

test.beforeAll(async () => {
  // a first run pulls the Anvil image
  test.setTimeout(180_000)
  await startAnvil()
})

test.afterAll(stopAnvil)

/**
 * Funds the account on a local Anvil chain and adds that chain to the wallet from the dapp.
 * The wallet sends a legacy transaction when the chain's base fee is zero, else an EIP-1559 one.
 */
const useAnvil = async (session: Session, baseFeePerGas: bigint) => {
  await anvilRpc("anvil_setBalance", [session.address, toHex(ETHER)])
  await anvilRpc("anvil_setNextBlockBaseFeePerGas", [toHex(baseFeePerGas)])
  await anvilRpc("evm_mine")

  const popup = await requestFromDapp(session, {
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: toHex(ANVIL.chainId),
        chainName: "Anvil",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: [ANVIL.url],
      },
    ],
  })
  await popup.getByRole("button", { name: "Approve" }).click()
  await dappResult(session.dapp)

  // The wallet answers wallet_addEthereumChain before it can serve the chain: until then a
  // request to it fails with "Network not supported", and a transaction opens no popup.
  await expect
    .poll(
      () =>
        session.dapp.evaluate(() =>
          (window as LedgerDappWindow).ledgerDapp
            ?.send({ method: "eth_blockNumber", params: [] })
            .then(
              () => true,
              () => false
            )
        ),
      { message: "the wallet serves the Anvil chain" }
    )
    .toBe(true)
}

type TransactionRequest = { from: string; to: string; value: Hex; data?: Hex }

const sendTransaction = (request: TransactionRequest): DappCall => ({
  method: "eth_sendTransaction",
  params: [request],
})

/** Reads the transaction that Anvil mined and recovers who signed it. */
const verifyTransaction =
  (type: "legacy" | "eip1559"): SigningCase["verify"] =>
  async (hash, call, { address }) => {
    const [request] = call.params as [TransactionRequest]
    const raw = await anvilRpc<TransactionSerialized>("eth_getRawTransactionByHash", [hash])
    const transaction = parseTransaction(raw)

    expect(transaction.type).toBe(type)
    expect({
      chainId: transaction.chainId,
      to: transaction.to,
      value: toHex(transaction.value ?? 0n),
      data: transaction.data,
    }).toEqual({
      chainId: ANVIL.chainId,
      to: request.to.toLowerCase(),
      value: request.value,
      data: request.data,
    })
    expect(await recoverTransactionAddress({ serializedTransaction: raw })).toBe(
      getAddress(address)
    )
  }

const transfer = (from: string) =>
  sendTransaction({ from, to: RECIPIENT, value: toHex(ETHER / 1000n) })

const MESSAGE = toHex("Talisman Ledger emulator e2e")

const personalMessage: SigningCase = {
  name: "a personal message",
  asksRiskAssessment: true,
  request: ({ address }) => ({ method: "personal_sign", params: [MESSAGE, address] }),
  verify: async (signature, _call, { address }) => {
    const signer = await recoverMessageAddress({
      message: { raw: MESSAGE },
      signature: signature as Hex,
    })
    expect(signer).toBe(getAddress(address))
  },
}

const TYPED_DATA = {
  domain: { name: "Talisman", version: "1", chainId: 1, verifyingContract: RECIPIENT },
  primaryType: "Mail",
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Mail: [
      { name: "to", type: "address" },
      { name: "contents", type: "string" },
    ],
  },
  message: { to: RECIPIENT, contents: "Talisman Ledger emulator e2e" },
} as const

// ERC-20 transfer(RECIPIENT, 1): calldata that the Ethereum app cannot clear-sign
const CALLDATA: Hex = `0xa9059cbb${RECIPIENT.slice(2).toLowerCase().padStart(64, "0")}${"1".padStart(64, "0")}`

const contractCall: SigningCase = {
  name: "a transaction with calldata",
  asksRiskAssessment: true,
  prepare: (session) => useAnvil(session, GWEI),
  request: ({ address }) =>
    sendTransaction({ from: address, to: RECIPIENT, value: "0x0", data: CALLDATA }),
  verify: verifyTransaction("eip1559"),
}

ledgerSuite({
  app: "ethereum",
  deviceAccountZero: () => launcher("eth-address", "0"),
  installDapp: () => {
    const provider = (window as EthereumWindow).talismanEth
    if (!provider) return false
    ;(window as LedgerDappWindow).ledgerDapp = {
      connect: () => provider.request({ method: "eth_requestAccounts" }) as Promise<string[]>,
      send: ({ method, params }) => provider.request({ method, params: params as unknown[] }),
    }
    return true
  },
  connectPreselectsAccount: true,
  signing: [
    personalMessage,
    {
      name: "a legacy transaction",
      asksRiskAssessment: true,
      prepare: (session) => useAnvil(session, 0n),
      request: ({ address }) => transfer(address),
      verify: verifyTransaction("legacy"),
    },
    {
      name: "an EIP-1559 transaction",
      asksRiskAssessment: true,
      prepare: (session) => useAnvil(session, GWEI),
      request: ({ address }) => transfer(address),
      verify: verifyTransaction("eip1559"),
    },
    {
      name: "EIP-712 typed data",
      asksRiskAssessment: true,
      // the Ethereum app clear-signs typed data only for the contracts it knows
      prepare: async () => {
        await launcher("enable-blind-signing")
      },
      request: ({ address }) => ({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(TYPED_DATA)],
      }),
      verify: async (signature, _call, { address }) => {
        const signer = await recoverTypedDataAddress({
          ...TYPED_DATA,
          // viem takes a uint256 as a bigint, JSON carries it as a number
          domain: { ...TYPED_DATA.domain, chainId: BigInt(TYPED_DATA.domain.chainId) },
          signature: signature as Hex,
        })
        expect(signer).toBe(getAddress(address))
      },
    },
  ],
  errorSigning: personalMessage,
  errors: [
    rejectedOnDevice,
    {
      name: "blind signing is disabled in the Ethereum app",
      signing: contractCall,
      cause: async (sign) => {
        await launcher("disable-blind-signing")
        await sign()
      },
      message: "Please enable Blind signing or Contract data in the Ethereum app Settings",
      recover: async () => {
        await launcher("enable-blind-signing")
      },
    },
    wrongAppOpen("ethereum", "solana"),
    emulatorStopped("ethereum"),
  ],
})
