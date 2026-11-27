import "./common/polyfills"

import {
  type FetchBalanceResults,
  getGammaDeposits,
  SubGammaBalanceModule,
} from "@talismn/balances"
import type { ChainConnectorDotStub } from "@talismn/chain-connectors"
import { fetchBestMetadata } from "@talismn/sapi"

import { connectFinney, FINNEY_RPC } from "./gammaAccounts"
import { log } from "./log"

const NETWORK_ID = "bittensor"
const COLDKEYS = [
  "5Fo2v1deBHBzANPFNHf9rCYfGcgSLy8PbPJUg4vwqCN1wzG3",
  "5CLWmDjLwkDtLQ86y9aiwfzrUCrtnnSWS9oEXianj2jMDCAo",
  "5DbyUgRHKtebU6QwbyNpYHiUqLDAZ9xHo12A84U9ER228JDM",
]
const WINDOW_MS = Number(process.env.GAMMA_WINDOW_MS ?? 65_000)

const countRequests = (connector: ChainConnectorDotStub) => {
  const counts: Record<string, number> = {}
  const send = connector.send.bind(connector)
  connector.send = ((networkId: string, method: string, params: unknown[], ...rest: unknown[]) => {
    const key = method === "state_call" ? `state_call ${params[0]}` : method
    counts[key] = (counts[key] ?? 0) + 1
    return send(networkId, method, params, ...(rest as []))
  }) as typeof connector.send
  return () => {
    const taken = { ...counts }
    for (const key of Object.keys(counts)) delete counts[key]
    return taken
  }
}

const printBalances = ({ success, errors, dynamicTokens }: FetchBalanceResults) => {
  log.log(
    `balances ${success.length}, errors ${errors.length}, dynamic tokens ${dynamicTokens?.length ?? 0}`
  )
  for (const balance of success) {
    const deposits = getGammaDeposits(balance)
    const total = deposits.reduce((sum, deposit) => sum + deposit.balance, 0n)
    log.log(`  ${balance.address} ${balance.tokenId} total ${total}`)
    for (const { hotkey, balance: amount, spendable, dailySpendCap, status } of deposits)
      log.log(
        `    ${hotkey} balance ${amount} spendable ${spendable} cap ${dailySpendCap} ${status}`
      )
  }
  for (const { tokenId, address, error } of errors)
    log.log(`  error ${address} ${tokenId}: ${error.message}`)
  for (const token of dynamicTokens ?? []) log.log(`  dynamic token ${token.id}`)
}

const main = async () => {
  const connector = connectFinney(FINNEY_RPC)
  const takeRequests = countRequests(connector)
  try {
    const { specVersion } = await connector.send<{ specVersion: number }>(
      NETWORK_ID,
      "state_getRuntimeVersion",
      []
    )
    const metadataRpc = await fetchBestMetadata(
      (method, params) => connector.send(NETWORK_ID, method, params),
      false
    )
    takeRequests()

    const miniMetadata = SubGammaBalanceModule.getMiniMetadata({
      networkId: NETWORK_ID,
      specVersion,
      metadataRpc,
    })
    log.log(
      `spec ${specVersion}: metadata ${(metadataRpc.length - 2) / 2} bytes, mini-metadata ${miniMetadata.data ? (miniMetadata.data.length - 2) / 2 : null} bytes`
    )

    const tokensStart = performance.now()
    const tokens = await SubGammaBalanceModule.fetchTokens({
      networkId: NETWORK_ID,
      connector,
      miniMetadata,
      tokens: [],
      cache: {},
    })
    log.log(
      `fetchTokens: ${tokens.length} tokens in ${Math.round(performance.now() - tokensStart)} ms, requests`,
      takeRequests()
    )
    for (const token of tokens) log.log(`  ${token.id} ${token.symbol} "${token.name}"`)

    const tokensWithAddresses = tokens.map((token) => [token, COLDKEYS] as [typeof token, string[]])
    const balances = await SubGammaBalanceModule.fetchBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses,
      connector,
      miniMetadata,
    })
    log.log(`fetchBalances for ${COLDKEYS.length} coldkeys, requests`, takeRequests())
    printBalances(balances)

    const windowStart = performance.now()
    const emits: number[] = []
    const subscription = SubGammaBalanceModule.subscribeBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses,
      connector,
      miniMetadata,
    }).subscribe((results) => {
      emits.push(Math.round(performance.now() - windowStart))
      log.log(`emit at ${emits.at(-1)} ms`)
      printBalances(results)
    })
    await new Promise((resolve) => setTimeout(resolve, WINDOW_MS))
    subscription.unsubscribe()
    log.log(
      `subscribeBalances ${WINDOW_MS} ms window: ${emits.length} emits, requests`,
      takeRequests()
    )

    try {
      SubGammaBalanceModule.getTransferCallData({
        from: COLDKEYS[0],
        to: COLDKEYS[1],
        value: "1",
        token: tokens[0],
        metadataRpc,
        type: "keep-alive",
        connector,
      })
      log.log("getTransferCallData returned call data")
    } catch (error) {
      log.log(`getTransferCallData threw: ${error instanceof Error ? error.message : error}`)
    }
  } finally {
    connector.destroy()
  }
}

if (require.main === module)
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      log.error(error)
      process.exit(1)
    })
