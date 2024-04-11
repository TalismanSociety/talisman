import {
  getBlowfishChainInfo,
  getBlowfishClient,
  serializeTransactionRequest,
} from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useMemo, useState } from "react"
import { TransactionRequest } from "viem"

export const useScanEvmTransaction = (
  evmNetworkId: EvmNetworkId | undefined,
  tx: TransactionRequest | undefined,
  url?: string
) => {
  const [autoValidate, setAutoValidate] = useState(true) // TODO settingsStore.get("autoValidateTransactions")

  const origin = useMemo(() => {
    if (url) {
      try {
        return new URL(url).origin
      } catch (err) {
        // ignore
      }
    }
    return window.location.origin // fallback to extension's origin
  }, [url])

  const chainInfo = useMemo(() => {
    if (!evmNetworkId || !tx) return null
    return getBlowfishChainInfo(evmNetworkId)
  }, [evmNetworkId, tx])

  const isAvailable = useMemo(() => !!chainInfo, [chainInfo])

  const {
    isLoading,
    data: result,
    error,
  } = useQuery({
    queryKey: [
      "useScanTransaction",
      evmNetworkId,
      tx && serializeTransactionRequest(tx) && autoValidate,
      origin,
    ],
    queryFn: () => {
      if (!evmNetworkId || !tx || !autoValidate) return null
      const client = getBlowfishClient(evmNetworkId)
      if (!client) return null

      // TODO remove
      log.debug("querying blowfish", { evmNetworkId, tx, origin })

      return client.scanTransactions(
        [
          {
            data: tx.data,
            from: tx.from,
            to: tx.to ?? undefined,
            value: typeof tx.value === "bigint" ? tx.value.toString() : undefined,
          },
        ],
        tx.from,
        { origin }
      )
    },
    enabled: !!tx && !!evmNetworkId && autoValidate,
    refetchInterval: false,
    retry: false,
  })

  return useMemo(
    () => ({
      isAvailable,
      isValidating: isAvailable && autoValidate && isLoading,
      result,
      error,
      validate: isAvailable && autoValidate ? undefined : () => setAutoValidate(true),
      chainInfo,
    }),
    [autoValidate, chainInfo, error, isAvailable, isLoading, result]
  )
}
