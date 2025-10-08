import { Transaction, VersionedTransaction } from "@solana/web3.js"
import { parseTransactionInfo } from "@talismn/solana"
import { throwAfter } from "@talismn/util"
import { useSuspenseQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useTranslation } from "react-i18next"

import { useNetworks } from "@ui/state"

import { getFrontEndSolanaConnection } from "./useSolanaConnection"

/**
 * ⚠️ This hook suspenses until the network ID is found for the given transaction.
 *
 * @param transaction
 * @returns
 */
export const useSolanaNetworkIdForTransaction = (
  transaction: VersionedTransaction | Transaction,
) => {
  const { t } = useTranslation()
  // find on which network the tx is for, based on the transaction data
  const networks = useNetworks({ platform: "solana" })

  return useSuspenseQuery({
    queryKey: ["useSolanaNetworkIdForTransaction", transaction, networks],
    queryFn: async () => {
      if (!transaction || !networks.length) return null

      const { recentBlockhash } = parseTransactionInfo(transaction)
      if (!recentBlockhash) return "solana-mainnet" // default to mainnet if no blockhash is found

      try {
        const networkId = await Promise.race([
          firstNonNullString(
            networks.map(async (network) => {
              try {
                const connection = getFrontEndSolanaConnection(network.id)
                if (!connection) return null
                const result = await connection.isBlockhashValid(recentBlockhash, {
                  commitment: "processed", // Fastest, but may include blocks that could be rolled back.
                })
                return result.value ? network.id : null
              } catch (err) {
                return null
              }
            }),
          ),
          throwAfter(5_000, "Timeout"),
        ])

        if (!networkId) throw new Error("No valid network found for the transaction")

        return networkId
      } catch (err) {
        log.warn("Failed to find Solana network for transaction", {
          transaction,
          error: err,
        })
        // this is a suspense hook so we dont want to throw an error here
        throw new Error(t("Failed to identify network for this transaction"))
      }
    },
  })
}

async function firstNonNullString(promises: Promise<string | null>[]): Promise<string> {
  return new Promise((resolve) => {
    let resolved = false

    for (const p of promises) {
      p.then((value) => {
        if (!resolved && typeof value === "string") {
          resolved = true
          resolve(value)
        }
      }).catch(() => {
        // ignore errors
      })
    }
  })
}
