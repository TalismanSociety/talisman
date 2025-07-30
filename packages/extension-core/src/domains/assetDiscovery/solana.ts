import { Connection, PublicKey } from "@solana/web3.js"
import { solSplTokenId } from "@talismn/chaindata-provider"
import { isSolanaAddress } from "@talismn/crypto"
import { isAccountNotContact, isAccountPlatformSolana } from "@talismn/keyring"
import { liveQuery } from "dexie"
import { log } from "extension-shared"
import { isEqual, uniq } from "lodash-es"
import { combineLatest, distinctUntilChanged, filter, first, map, pairwise } from "rxjs"

import { db } from "../../db"
import { isWalletReady$ } from "../../libs/isWalletReady"
import { chainConnectorSol } from "../../rpcs/chain-connector-sol"
import { chaindataProvider } from "../../rpcs/chaindata"
import { activeNetworksStore } from "../balances/store.activeNetworks"
import { activeTokensStore } from "../balances/store.activeTokens"
import { keyringStore } from "../keyring/store"

const MAINNET_NETWORK_ID = "solana-mainnet"
const SPL_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

const discoverSolanaAssets = async (addresses?: string[]) => {
  const activeNetworks = await activeNetworksStore.get()
  if (activeNetworks[MAINNET_NETWORK_ID] === false) return

  const accounts = await keyringStore.getAccounts()
  addresses =
    addresses?.filter(isSolanaAddress) ??
    accounts
      .filter(isAccountNotContact)
      .filter(isAccountPlatformSolana)
      .map((acc) => acc.address)
  if (!addresses.length) return

  const connection = await chainConnectorSol.getConnection(MAINNET_NETWORK_ID)
  const knownSplTokenIds = await chaindataProvider.getTokenIds("sol-spl")

  const results = await Promise.all(
    addresses.map((address) => {
      return getSplTokenIdsForOwner(connection, address)
    }),
  )

  const splTokenIds = uniq(results.flat().filter((id) => knownSplTokenIds.includes(id)))

  const activeTokens = await activeTokensStore.get()
  const newTokenIds = splTokenIds.filter((id) => activeTokens[id] === undefined)

  if (newTokenIds.length) {
    log.debug("[discoverSolanaAssets] discovered new SPL tokens", { newTokenIds })

    await activeTokensStore.mutate((activeTokens) => ({
      ...activeTokens,
      ...Object.fromEntries(newTokenIds.map((id) => [id, true])),
    }))
  }
}

const getSplTokenIdsForOwner = async (connection: Connection, address: string) => {
  try {
    // fetch SPL balances for the address
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(address),
      {
        programId: new PublicKey(SPL_PROGRAM_ID), // SPL Token Program ID
      },
      "confirmed",
    )

    const mintAddresses = tokenAccounts.value.map((d) => d.account.data.parsed.info.mint as string)
    return mintAddresses.map((mintAddress) => solSplTokenId(MAINNET_NETWORK_ID, mintAddress))
  } catch (err) {
    return []
  }
}

export const initialiseSolanaAssetDiscovery = () => {
  // launch a scan when wallet is ready (unlocked and migrations are complete)
  isWalletReady$
    .pipe(
      filter((ready) => ready),
      first(),
    )
    .subscribe(() => {
      log.debug("[discoverSolanaAssets] wallet is ready, launching scan")
      discoverSolanaAssets()
    })

  // launch a scan when solana-mainnet is enabled (only if it was not enabled before)
  combineLatest({
    isWalletReady: isWalletReady$,
    activeNetworks: activeNetworksStore.observable,
  })
    .pipe(
      filter(({ isWalletReady }) => !!isWalletReady),
      map(({ activeNetworks }) => !!activeNetworks["solana-mainnet"]),
      distinctUntilChanged(),
      pairwise(), // Emit pairs of [previous, current] enabled state
      filter(([previous, current]) => !previous && current), // Only emit when it changes from false to true
    )
    .subscribe(() => {
      log.debug("[discoverSolanaAssets] solana-mainnet enabled, launching scan")
      discoverSolanaAssets()
    })

  // launch a scan for newly added solana accounts
  combineLatest({ isWalletReady: isWalletReady$, accounts: keyringStore.accounts$ })
    .pipe(
      filter(({ isWalletReady }) => !!isWalletReady),
      map(({ accounts }) =>
        accounts
          .filter(isAccountNotContact)
          .filter(isAccountPlatformSolana)
          .map((acc) => acc.address),
      ),
      distinctUntilChanged<string[]>(isEqual),
      pairwise(), // Emit pairs of [previous, current] solana addresses
      filter(([previous, current]) => previous.length < current.length),
      map(([previous, current]) => current.filter((addr) => !previous.includes(addr))),
      filter((newAddresses) => !!newAddresses.length),
    )
    .subscribe((newSolanaAddresses) => {
      log.debug(
        "[discoverSolanaAssets] %s new solana accounts found, launching scan",
        newSolanaAddresses.length,
      )
      discoverSolanaAssets(newSolanaAddresses)
    })

  // launch a scan after every confirmed solana transaction
  combineLatest({
    isWalletReady: isWalletReady$,
    transactions: liveQuery(() =>
      db.transactionsV2
        //.where({ networkId: "solana-mainnet", status: "success", confirmed: true })
        .toArray(),
    ),
  })
    .pipe(
      filter(({ isWalletReady }) => !!isWalletReady),
      map(
        ({ transactions }) =>
          transactions.filter(
            (tx) => tx.networkId === MAINNET_NETWORK_ID && tx.status === "success" && tx.confirmed,
          ).length,
      ),
      distinctUntilChanged(),
      pairwise(), // Emit pairs of [previous, current] transaction count
      filter(([previous, current]) => previous < current), // Only emit when it increases
    )
    .subscribe(() => {
      log.debug("[discoverSolanaAssets] new confirmed solana transaction, launching scan")
      discoverSolanaAssets()
    })
}
