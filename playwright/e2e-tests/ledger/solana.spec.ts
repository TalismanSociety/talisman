import { ed25519 } from "@noble/curves/ed25519.js"
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  type Blockhash,
  compileTransaction,
  createTransactionMessage,
  getAddressDecoder,
  getAddressEncoder,
  getTransactionDecoder,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit"

import { expect } from "../fixtures"
import { liveRpc } from "./chains"
import { exchange, hardened } from "./emulator"
import {
  emulatorStopped,
  type LedgerDappWindow,
  ledgerSuite,
  rejectedOnDevice,
  type SigningCase,
  wrongAppOpen,
} from "./suite"

type StandardAccount = { address: string }
type StandardWallet = {
  name: string
  features: {
    "standard:connect": { connect: () => Promise<{ accounts: StandardAccount[] }> }
    "solana:signTransaction": {
      signTransaction: (input: {
        account: StandardAccount
        transaction: Uint8Array
        chain: string
      }) => Promise<{ signedTransaction: Uint8Array }[]>
    }
    "solana:signMessage": {
      signMessage: (input: {
        account: StandardAccount
        message: Uint8Array
      }) => Promise<{ signature: Uint8Array; signedMessage: Uint8Array }[]>
    }
  }
}

const publicKey = (account: string) => Uint8Array.from(getAddressEncoder().encode(address(account)))

const SYSTEM_PROGRAM = address("11111111111111111111111111111111")
// the System program's Transfer instruction: index 2, then the lamports
const TRANSFER_ONE_LAMPORT = Uint8Array.from([2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0])

const transaction: SigningCase = {
  name: "a transaction",
  asksRiskAssessment: true,
  // The wallet finds the network of a transaction by its blockhash, and lets the user sign
  // only while that blockhash is valid, so it must be a recent one of the live network.
  request: async ({ address: account }) => {
    const { value: lifetime } = await liveRpc<{
      value: { blockhash: Blockhash; lastValidBlockHeight: number }
    }>("solana-mainnet", "getLatestBlockhash", [{ commitment: "confirmed" }])
    const signer = address(account)
    const message = pipe(
      createTransactionMessage({ version: "legacy" }),
      (m) => setTransactionMessageFeePayer(signer, m),
      (m) =>
        setTransactionMessageLifetimeUsingBlockhash(
          {
            blockhash: lifetime.blockhash,
            lastValidBlockHeight: BigInt(lifetime.lastValidBlockHeight),
          },
          m
        ),
      (m) =>
        appendTransactionMessageInstruction(
          {
            programAddress: SYSTEM_PROGRAM,
            accounts: [
              { address: signer, role: AccountRole.WRITABLE_SIGNER },
              { address: signer, role: AccountRole.WRITABLE },
            ],
            data: TRANSFER_ONE_LAMPORT,
          },
          m
        )
    )
    return {
      method: "signTransaction",
      params: Array.from(getTransactionEncoder().encode(compileTransaction(message))),
    }
  },
  verify: (result, call, { address: account }) => {
    const decode = (wire: unknown) =>
      getTransactionDecoder().decode(Uint8Array.from(wire as number[]))
    const requested = decode(call.params)
    const signed = decode(result)

    expect(Buffer.from(signed.messageBytes)).toEqual(Buffer.from(requested.messageBytes))
    const signature = signed.signatures[address(account)]
    expect(signature, "the transaction carries the account's signature").toBeTruthy()
    expect(
      ed25519.verify(
        Uint8Array.from(signature ?? []),
        Uint8Array.from(signed.messageBytes),
        publicKey(account)
      )
    ).toBe(true)
  },
}

const TEXT = "Talisman Ledger emulator e2e"

/**
 * The off-chain message envelope (v0) that the Solana app signs in place of the bare message:
 * https://github.com/anza-xyz/agave/blob/master/docs/src/proposals/off-chain-message-signing.md
 */
const offchainMessage = (signer: Uint8Array, text: string) =>
  Uint8Array.from(
    Buffer.concat([
      Buffer.from("\xffsolana offchain", "latin1"),
      Buffer.from([0]), // header version
      Buffer.alloc(32), // application domain: none
      Buffer.from([0]), // format: restricted ASCII
      Buffer.from([1]), // one signer
      signer,
      Buffer.from([text.length & 0xff, text.length >> 8]),
      Buffer.from(text, "ascii"),
    ])
  )

const message: SigningCase = {
  name: "a message",
  request: () => ({ method: "signMessage", params: Array.from(Buffer.from(TEXT, "ascii")) }),
  verify: (result, _call, { address: account }) => {
    const { signature, signedMessage } = result as { signature: number[]; signedMessage: number[] }
    const envelope = offchainMessage(publicKey(account), TEXT)

    expect(Buffer.from(signedMessage)).toEqual(Buffer.from(envelope))
    expect(ed25519.verify(Uint8Array.from(signature), envelope, publicKey(account))).toBe(true)
  },
}

ledgerSuite({
  app: "solana",
  // @ledgerhq/hw-app-solana: GET_PUBKEY at the Ledger Live path m/44'/501'/0'
  deviceAccountZero: async () => {
    const payload = Buffer.alloc(13)
    payload[0] = 3
    for (const [i, index] of [44, 501, 0].entries())
      payload.writeUInt32BE(hardened(index), 1 + i * 4)
    const response = await exchange(
      `e0050000${payload.length.toString(16).padStart(2, "0")}${payload.toString("hex")}`
    )
    return getAddressDecoder().decode(response.subarray(0, 32))
  },
  installDapp: () => {
    const wallets: StandardWallet[] = []
    const register = (...registered: StandardWallet[]) => wallets.push(...registered)
    // the wallet answers the app-ready event of the wallet standard by registering itself
    window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: { register } }))
    const wallet = wallets.find(({ name }) => name === "Talisman")
    if (!wallet) return false

    let account: StandardAccount
    ;(window as LedgerDappWindow).ledgerDapp = {
      connect: async () => {
        const { accounts } = await wallet.features["standard:connect"].connect()
        account = accounts[0]
        return accounts.map(({ address }) => address)
      },
      // byte arrays cross to and from the page as arrays of numbers
      send: async ({ method, params }) => {
        const input = Uint8Array.from(params as number[])
        if (method === "signTransaction") {
          const [{ signedTransaction }] = await wallet.features[
            "solana:signTransaction"
          ].signTransaction({ account, transaction: input, chain: "solana:mainnet" })
          return Array.from(signedTransaction)
        }
        const [{ signature, signedMessage }] = await wallet.features[
          "solana:signMessage"
        ].signMessage({ account, message: input })
        return { signature: Array.from(signature), signedMessage: Array.from(signedMessage) }
      },
    }
    return true
  },
  signing: [transaction, message],
  errorSigning: message,
  errors: [rejectedOnDevice, wrongAppOpen("solana", "polkadot"), emulatorStopped("solana")],
})
