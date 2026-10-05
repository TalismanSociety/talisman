import { ETH_ERROR_EIP1193_USER_REJECTED } from "@common/EthProviderRpcError"
import { recoverTypedSignature, SignTypedDataVersion } from "@metamask/eth-sig-util"
import type { EvmErc20Token, EvmNativeToken, Network } from "@talismn/chaindata-provider"
import type { Account } from "@talismn/keyring"
import { hexToU8a } from "@talismn/util"
import { waitFor } from "@testing-library/dom"
import type { TransactionRequest } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { extensionStores } from "../../handlers/stores"
import { requestStore } from "../../libs/requests/store"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { MessageTypes, RequestTypes } from "../../types"
import { passwordStore } from "../app/store.password"
import { activeNetworksStore } from "../chaindata/store.activeNetworks"
import { activeTokensStore } from "../chaindata/store.activeTokens"
import { customChaindataStore } from "../chaindata/store.customChaindata"
import { keyringStore } from "../keyring/store"
import { requestEthSendTransaction, requestEthSign } from "../signing/requests"
import { watchEthereumTransaction } from "../transactions/watchEthereumTransaction"
import { EthHandler } from "./handler.extension"
import { getNextNonce, releaseReservedNonce } from "./nonceManager"
import { requestAddNetwork, requestWatchAsset } from "./requests"
import { ETH_NETWORK_ADD_PREFIX, WATCH_ASSET_PREFIX } from "./types"

vi.mock("../transactions/watchEthereumTransaction", () => ({ watchEthereumTransaction: vi.fn() }))
vi.mock("./nonceManager", () => ({ getNextNonce: vi.fn(), releaseReservedNonce: vi.fn() }))
vi.mock("../../libs/WindowManager", () => ({
  windowManager: { popupOpen: vi.fn(async () => 1), popupClose: vi.fn() },
}))

// hardhat #0
const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const signer = privateKeyToAccount(PRIVATE_KEY)

const CHAIN_ID = "1"
const DAPP_URL = "https://app.example.com/swap"
const PORT = {} as chrome.runtime.Port
const HASH = `0x${"ab".repeat(32)}` as const
const SIGNED_TX = "0x02f86c0180843b9aca00" as const
const ACCOUNT = { type: "keypair", curve: "ethereum", address: ADDRESS, name: "Test" } as Account

const TRANSACTION: TransactionRequest<string> = {
  from: ADDRESS,
  to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  value: "1000",
  gas: "21000",
}

type TypedData = Parameters<typeof signer.signTypedData>[0]

const TYPED_DATA_V3: TypedData = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "chainId", type: "uint256" },
    ],
    Mail: [
      { name: "to", type: "address" },
      { name: "contents", type: "string" },
    ],
  },
  primaryType: "Mail",
  domain: { name: "Talisman", chainId: 1n },
  message: { to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", contents: "gm" },
}

// arrays are what v4 added over v3
const TYPED_DATA_V4: TypedData = {
  ...TYPED_DATA_V3,
  types: {
    ...TYPED_DATA_V3.types,
    Mail: [
      { name: "to", type: "address[]" },
      { name: "contents", type: "string" },
    ],
  },
  message: { to: ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8"], contents: "gm" },
}

const TYPED_DATA_V1 = [{ type: "string", name: "message", value: "gm" }]

const handler = new EthHandler(extensionStores)
const send = <T extends MessageTypes>(type: T, request: RequestTypes[T]) =>
  handler.handle("id", type, request, PORT)

const lockWallet = () => vi.mocked(passwordStore.getPassword).mockResolvedValue(undefined)

const walletClient = {
  chain: { id: 1 },
  sendTransaction: vi.fn(),
  sendRawTransaction: vi.fn(),
}

const queueEthSign = async (method: Parameters<typeof requestEthSign>[1], request: string) => {
  const response = requestEthSign(DAPP_URL, method, [] as never, request, CHAIN_ID, ACCOUNT, PORT)
  response.catch(() => {})
  await waitFor(() => expect(requestStore.getCounts().get("eth-sign")).toBe(1))
  const [queued] = requestStore.allRequests("eth-sign")
  return { id: queued.id, response }
}

const queueEthSend = async () => {
  const response = requestEthSendTransaction(
    DAPP_URL,
    TRANSACTION as never,
    CHAIN_ID,
    ACCOUNT,
    PORT
  )
  response.catch(() => {})
  await waitFor(() => expect(requestStore.getCounts().get("eth-send")).toBe(1))
  const [queued] = requestStore.allRequests("eth-send")
  return { id: queued.id, response }
}

describe("EthHandler", () => {
  beforeEach(() => {
    requestStore.clearRequests()
    vi.spyOn(keyringStore, "getAccount").mockResolvedValue(ACCOUNT)
    vi.spyOn(keyringStore, "getAccountSecretKey").mockImplementation(async () =>
      hexToU8a(PRIVATE_KEY)
    )
    vi.spyOn(passwordStore, "getPassword").mockResolvedValue("hashed")
    vi.spyOn(passwordStore, "clearPassword").mockResolvedValue(undefined)
    vi.mocked(getNextNonce).mockResolvedValue(7)
    walletClient.sendTransaction.mockResolvedValue(HASH)
    walletClient.sendRawTransaction.mockResolvedValue(HASH)
    vi.spyOn(chainConnectorEvm, "getWalletClientForEvmNetwork").mockResolvedValue(
      walletClient as never
    )
    vi.spyOn(chainConnectorEvm, "getPublicClientForEvmNetwork").mockResolvedValue(
      walletClient as never
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe("pri(eth.signing.approveSign)", () => {
    it("signs personal_sign messages like any EIP-191 signer", async () => {
      const message = "0x68656c6c6f"
      const { id, response } = await queueEthSign("personal_sign", message)

      await expect(send("pri(eth.signing.approveSign)", { id })).resolves.toBe(true)

      await expect(response).resolves.toBe(await signer.signMessage({ message: { raw: message } }))
    })

    it.each([
      ["eth_signTypedData_v3", TYPED_DATA_V3],
      ["eth_signTypedData_v4", TYPED_DATA_V4],
    ] as const)("signs %s like any EIP-712 signer", async (method, typedData) => {
      const { id, response } = await queueEthSign(
        method,
        JSON.stringify(typedData, (_, value) => (typeof value === "bigint" ? Number(value) : value))
      )

      await send("pri(eth.signing.approveSign)", { id })

      await expect(response).resolves.toBe(await signer.signTypedData(typedData))
    })

    it.each(["eth_signTypedData", "eth_signTypedData_v1"] as const)(
      "signs %s as legacy typed data",
      async (method) => {
        const { id, response } = await queueEthSign(method, JSON.stringify(TYPED_DATA_V1))

        await send("pri(eth.signing.approveSign)", { id })

        const signature = await response
        expect(
          recoverTypedSignature({
            data: TYPED_DATA_V1,
            signature,
            version: SignTypedDataVersion.V1,
          }).toLowerCase()
        ).toBe(ADDRESS.toLowerCase())
      }
    )

    it("rejects the queued request while the wallet is locked", async () => {
      lockWallet()
      const { id, response } = await queueEthSign("personal_sign", "0x00")

      await expect(send("pri(eth.signing.approveSign)", { id })).resolves.toBe(false)

      await expect(response).rejects.toThrow("Unauthorised")
      expect(requestStore.getCounts().get("eth-sign")).toBe(0)
    })

    it("throws on a signing failure and keeps the request queued", async () => {
      const { id } = await queueEthSign("eth_signTypedData_v4", "not json")

      await expect(send("pri(eth.signing.approveSign)", { id })).rejects.toThrow(/JSON/)
      expect(requestStore.getCounts().get("eth-sign")).toBe(1)
    })

    it("refuses a transaction request", async () => {
      const { id } = await queueEthSend()

      await expect(send("pri(eth.signing.approveSign)", { id: id as never })).rejects.toThrow(
        "Unsupported method : eth_sendTransaction"
      )
    })
  })

  describe("pri(eth.signing.approveSignAndSend)", () => {
    it("signs and sends with a reserved nonce, then watches the transaction", async () => {
      const { id, response } = await queueEthSend()

      await expect(
        send("pri(eth.signing.approveSignAndSend)", { id, transaction: TRANSACTION })
      ).resolves.toBe(true)

      await expect(response).resolves.toBe(HASH)
      expect(getNextNonce).toHaveBeenCalledWith(ADDRESS, CHAIN_ID)
      expect(walletClient.sendTransaction).toHaveBeenCalledWith({
        chain: walletClient.chain,
        account: expect.objectContaining({ address: ADDRESS }),
        from: ADDRESS,
        to: TRANSACTION.to,
        value: 1000n,
        gas: 21000n,
        nonce: 7,
      })
      expect(watchEthereumTransaction).toHaveBeenCalledWith(
        CHAIN_ID,
        HASH,
        { ...TRANSACTION, nonce: 7 },
        { siteUrl: DAPP_URL, notifications: true }
      )
    })

    it("keeps the nonce the user set", async () => {
      const { id } = await queueEthSend()

      await send("pri(eth.signing.approveSignAndSend)", {
        id,
        transaction: { ...TRANSACTION, nonce: 3 },
      })

      expect(getNextNonce).not.toHaveBeenCalled()
      expect(walletClient.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ nonce: 3 })
      )
    })

    it("releases the reserved nonce and rejects the request while the wallet is locked", async () => {
      lockWallet()
      const { id, response } = await queueEthSend()

      await expect(
        send("pri(eth.signing.approveSignAndSend)", { id, transaction: TRANSACTION })
      ).resolves.toBe(false)

      expect(releaseReservedNonce).toHaveBeenCalledWith(ADDRESS, CHAIN_ID, 7)
      await expect(response).rejects.toThrow("Unauthorised")
    })

    it("releases the reserved nonce on a send failure and keeps the request queued", async () => {
      walletClient.sendTransaction.mockRejectedValue(
        Object.assign(new Error("long message"), { shortMessage: "insufficient funds" })
      )
      const { id } = await queueEthSend()

      await expect(
        send("pri(eth.signing.approveSignAndSend)", { id, transaction: TRANSACTION })
      ).rejects.toThrow("insufficient funds")

      expect(releaseReservedNonce).toHaveBeenCalledWith(ADDRESS, CHAIN_ID, 7)
      expect(watchEthereumTransaction).not.toHaveBeenCalled()
      expect(requestStore.getCounts().get("eth-send")).toBe(1)
    })

    it("does not release a nonce the user set", async () => {
      walletClient.sendTransaction.mockRejectedValue(new Error("nonce too low"))
      const { id } = await queueEthSend()

      await expect(
        send("pri(eth.signing.approveSignAndSend)", {
          id,
          transaction: { ...TRANSACTION, nonce: 3 },
        })
      ).rejects.toThrow("nonce too low")

      expect(releaseReservedNonce).not.toHaveBeenCalled()
    })
  })

  describe("pri(eth.signing.signAndSend)", () => {
    const txInfo = { type: "transfer" } as never

    it("signs and sends a wallet transaction with a reserved nonce", async () => {
      await expect(
        send("pri(eth.signing.signAndSend)", {
          evmNetworkId: CHAIN_ID,
          unsigned: TRANSACTION,
          txInfo,
        })
      ).resolves.toBe(HASH)

      expect(walletClient.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ nonce: 7, value: 1000n })
      )
      expect(watchEthereumTransaction).toHaveBeenCalledWith(
        CHAIN_ID,
        HASH,
        { ...TRANSACTION, nonce: 7 },
        { notifications: true, txInfo }
      )
    })

    it("releases the reserved nonce while the wallet is locked", async () => {
      lockWallet()

      await expect(
        send("pri(eth.signing.signAndSend)", { evmNetworkId: CHAIN_ID, unsigned: TRANSACTION })
      ).rejects.toThrow("Unauthorized")

      expect(releaseReservedNonce).toHaveBeenCalledWith(ADDRESS, CHAIN_ID, 7)
    })

    it("keeps the nonce the caller set", async () => {
      await send("pri(eth.signing.signAndSend)", {
        evmNetworkId: CHAIN_ID,
        unsigned: { ...TRANSACTION, nonce: 3 },
      })

      expect(getNextNonce).not.toHaveBeenCalled()
      expect(walletClient.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ nonce: 3 })
      )
    })

    it("requires a sender", async () => {
      await expect(
        send("pri(eth.signing.signAndSend)", {
          evmNetworkId: CHAIN_ID,
          unsigned: { ...TRANSACTION, from: undefined } as never,
        })
      ).rejects.toThrow("from is not defined")
    })
  })

  describe("pri(eth.signing.sendSigned)", () => {
    it("broadcasts the signed transaction and watches it", async () => {
      await expect(
        send("pri(eth.signing.sendSigned)", {
          evmNetworkId: CHAIN_ID,
          unsigned: TRANSACTION,
          signed: SIGNED_TX,
        })
      ).resolves.toBe(HASH)

      expect(walletClient.sendRawTransaction).toHaveBeenCalledWith({
        serializedTransaction: SIGNED_TX,
      })
      expect(watchEthereumTransaction).toHaveBeenCalledWith(CHAIN_ID, HASH, TRANSACTION, {
        notifications: true,
        txInfo: undefined,
      })
    })

    it("turns a node error into a readable message", async () => {
      walletClient.sendRawTransaction.mockRejectedValue({ code: -32003 })

      await expect(
        send("pri(eth.signing.sendSigned)", {
          evmNetworkId: CHAIN_ID,
          unsigned: TRANSACTION,
          signed: SIGNED_TX,
        })
      ).rejects.toThrow("Transaction rejected")
    })
  })

  describe("pri(eth.signing.approveSignAndSendHardware)", () => {
    it("broadcasts the Ledger-signed transaction and resolves with its hash", async () => {
      const { id, response } = await queueEthSend()

      await expect(
        send("pri(eth.signing.approveSignAndSendHardware)", {
          id,
          unsigned: TRANSACTION,
          signedPayload: SIGNED_TX,
        })
      ).resolves.toBe(true)

      await expect(response).resolves.toBe(HASH)
      expect(walletClient.sendRawTransaction).toHaveBeenCalledWith({
        serializedTransaction: SIGNED_TX,
      })
      expect(watchEthereumTransaction).toHaveBeenCalledWith(CHAIN_ID, HASH, TRANSACTION, {
        siteUrl: DAPP_URL,
        notifications: true,
      })
    })

    it("keeps the request queued when the broadcast fails", async () => {
      walletClient.sendRawTransaction.mockRejectedValue({ details: "already known" })
      const { id } = await queueEthSend()

      await expect(
        send("pri(eth.signing.approveSignAndSendHardware)", {
          id,
          unsigned: TRANSACTION,
          signedPayload: SIGNED_TX,
        })
      ).rejects.toThrow("already known")
      expect(requestStore.getCounts().get("eth-send")).toBe(1)
    })
  })

  it("pri(eth.signing.approveSignHardware) resolves with the Ledger signature", async () => {
    const { id, response } = await queueEthSign("personal_sign", "0x00")

    await expect(
      send("pri(eth.signing.approveSignHardware)", { id, signedPayload: SIGNED_TX })
    ).resolves.toBe(true)

    await expect(response).resolves.toBe(SIGNED_TX)
    expect(keyringStore.getAccountSecretKey).not.toHaveBeenCalled()
  })

  it("pri(eth.signing.cancel) rejects with an EIP-1193 user rejection", async () => {
    const { id, response } = await queueEthSend()

    await expect(send("pri(eth.signing.cancel)", { id })).resolves.toBe(true)

    await expect(response).rejects.toMatchObject({
      message: "Cancelled",
      code: ETH_ERROR_EIP1193_USER_REJECTED,
    })
    expect(requestStore.getCounts().get("eth-send")).toBe(0)
  })

  describe("watch asset requests", () => {
    const token = {
      id: "1:evm-erc20:0x6b175474e89094c44da98b954eedeac495271d0f",
      networkId: CHAIN_ID,
      symbol: "DAI",
      contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    } as unknown as EvmErc20Token

    const queueWatchAsset = async () => {
      const response = requestWatchAsset(
        DAPP_URL,
        { type: "ERC20", options: { address: token.contractAddress, symbol: "DAI", decimals: 18 } },
        token,
        [],
        PORT
      )
      response.catch(() => {})
      await waitFor(() => expect(requestStore.getAllRequests(WATCH_ASSET_PREFIX)).toHaveLength(1))
      const [queued] = requestStore.getAllRequests(WATCH_ASSET_PREFIX)
      return { id: queued.id, response }
    }

    beforeEach(() => {
      vi.spyOn(customChaindataStore, "upsertToken").mockResolvedValue(undefined as never)
      vi.spyOn(activeTokensStore, "setActive").mockResolvedValue(undefined)
    })

    it("adds an unknown token as custom and activates it", async () => {
      vi.spyOn(chaindataProvider, "getTokenById").mockResolvedValue(null as never)
      const { id, response } = await queueWatchAsset()

      await expect(send("pri(eth.watchasset.requests.approve)", { id })).resolves.toBe(true)

      await expect(response).resolves.toBe(true)
      expect(customChaindataStore.upsertToken).toHaveBeenCalledWith(token)
      expect(activeTokensStore.setActive).toHaveBeenCalledWith(token.id, true)
    })

    it("only activates a token chaindata already knows", async () => {
      vi.spyOn(chaindataProvider, "getTokenById").mockResolvedValue(token as never)
      const { id } = await queueWatchAsset()

      await send("pri(eth.watchasset.requests.approve)", { id })

      expect(customChaindataStore.upsertToken).not.toHaveBeenCalled()
      expect(activeTokensStore.setActive).toHaveBeenCalledWith(token.id, true)
    })

    it("rejects with an EIP-1193 user rejection", async () => {
      const { id, response } = await queueWatchAsset()

      await send("pri(eth.watchasset.requests.cancel)", { id })

      await expect(response).rejects.toMatchObject({
        message: "Rejected",
        code: ETH_ERROR_EIP1193_USER_REJECTED,
      })
      expect(requestStore.getAllRequests(WATCH_ASSET_PREFIX)).toHaveLength(0)
    })
  })

  describe("add network requests", () => {
    const network = {
      id: "8453",
      name: "Base",
      nativeTokenId: "8453:evm-native",
    } as Network
    const nativeToken = { id: "8453:evm-native" } as EvmNativeToken

    const queueAddNetwork = async () => {
      const response = requestAddNetwork(DAPP_URL, network, nativeToken, PORT)
      response.catch(() => {})
      await waitFor(() =>
        expect(requestStore.getAllRequests(ETH_NETWORK_ADD_PREFIX)).toHaveLength(1)
      )
      const [queued] = requestStore.getAllRequests(ETH_NETWORK_ADD_PREFIX)
      return { id: queued.id, response }
    }

    beforeEach(() => {
      vi.spyOn(customChaindataStore, "upsertNetwork").mockResolvedValue(undefined as never)
      vi.spyOn(activeTokensStore, "setActive").mockResolvedValue(undefined)
      vi.spyOn(activeNetworksStore, "setActive").mockResolvedValue(undefined)
      vi.spyOn(extensionStores.sites, "updateSite").mockResolvedValue(undefined as never)
    })

    it("adds an unknown network, activates it and switches the site to it", async () => {
      vi.spyOn(chaindataProvider, "getNetworkById").mockResolvedValue(null as never)
      const { id, response } = await queueAddNetwork()

      await expect(send("pri(eth.networks.add.approve)", { id })).resolves.toBe(true)

      await expect(response).resolves.toBeUndefined()
      expect(customChaindataStore.upsertNetwork).toHaveBeenCalledWith(network, nativeToken)
      expect(activeTokensStore.setActive).toHaveBeenCalledWith(network.nativeTokenId, true)
      expect(activeNetworksStore.setActive).toHaveBeenCalledWith(network.id, true)
      expect(extensionStores.sites.updateSite).toHaveBeenCalledWith("app.example.com", {
        ethChainId: 8453,
      })
    })

    it("does not overwrite a network chaindata already knows", async () => {
      vi.spyOn(chaindataProvider, "getNetworkById").mockResolvedValue(network as never)
      const { id } = await queueAddNetwork()

      await send("pri(eth.networks.add.approve)", { id })

      expect(customChaindataStore.upsertNetwork).not.toHaveBeenCalled()
      expect(activeNetworksStore.setActive).toHaveBeenCalledWith(network.id, true)
    })

    it("rejects with an EIP-1193 user rejection", async () => {
      const { id, response } = await queueAddNetwork()

      await send("pri(eth.networks.add.cancel)", { id })

      await expect(response).rejects.toMatchObject({
        message: "Rejected",
        code: ETH_ERROR_EIP1193_USER_REJECTED,
      })
    })
  })
})
