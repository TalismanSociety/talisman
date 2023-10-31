import { getEthersErrorLabelFromCode } from "@core/domains/ethereum/errors"
import {
  getGasLimit,
  getGasSettingsEip1559,
  getTotalFeesFromGasSettings,
  prepareTransaction,
  serializeTransactionRequest,
} from "@core/domains/ethereum/helpers"
import {
  EthGasSettings,
  EthGasSettingsEip1559,
  EthGasSettingsLegacy,
  EvmNetworkId,
} from "@core/domains/ethereum/types"
import {
  EthPriorityOptionName,
  EthPriorityOptionNameEip1559,
  EthPriorityOptionNameLegacy,
  EthTransactionDetails,
  GasSettingsByPriority,
} from "@core/domains/signing/types"
import { ETH_ERROR_EIP1474_METHOD_NOT_FOUND } from "@core/injectEth/EthProviderRpcError"
import { getEthTransactionInfo } from "@core/util/getEthTransactionInfo"
import { FeeHistoryAnalysis, getFeeHistoryAnalysis } from "@core/util/getFeeHistoryAnalysis"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { usePublicClient } from "@ui/domains/Ethereum/useEthereumProvider"
import { useAlec } from "@ui/hooks/useAlec"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { PublicClient, TransactionRequest } from "viem"

import { useIsValidEthTransaction } from "./useIsValidEthTransaction"

// gasPrice isn't reliable on polygon & mumbai, see https://github.com/ethers-io/ethers.js/issues/2828#issuecomment-1283014250
const UNRELIABLE_GASPRICE_NETWORK_IDS = [137, 80001]

const useNonce = (
  address: `0x${string}` | undefined,
  evmNetworkId: EvmNetworkId | undefined,
  forcedValue?: number
) => {
  const { data, ...rest } = useQuery({
    queryKey: ["nonce", address, evmNetworkId, forcedValue],
    queryFn: () => {
      if (forcedValue !== undefined) return forcedValue
      return address && evmNetworkId ? api.ethGetTransactionsCount(address, evmNetworkId) : null
    },
  })

  return { nonce: forcedValue ?? data ?? undefined, ...rest }
}

// TODO : could be skipped for networks that we know already support it, but need to keep checking for legacy network in case they upgrade
const useHasEip1559Support = (publicClient: PublicClient | undefined) => {
  const { data, ...rest } = useQuery({
    queryKey: ["hasEip1559Support", publicClient?.chain?.id],
    queryFn: async () => {
      if (!publicClient) return null

      try {
        const [{ baseFeePerGas }] = await Promise.all([
          // check that block has a baseFeePerGas
          // publicClient.send("eth_getBlockByNumber", ["latest", false]),
          publicClient.getBlock({ blockTag: "latest", includeTransactions: false }),

          // check that method eth_feeHistory exists. This will throw with code -32601 if it doesn't.
          //publicClient.send("eth_feeHistory", [ethers.utils.hexValue(1), "latest", [10]]),
          publicClient.getFeeHistory({
            blockCount: 1,
            blockTag: "latest",
            rewardPercentiles: [10],
          }),
        ])
        return baseFeePerGas !== undefined
      } catch (err) {
        // TODO check that feeHistory returns -32601 when method doesn't exist
        const error = err as Error & { code?: number }
        if (error.code === ETH_ERROR_EIP1474_METHOD_NOT_FOUND) return false

        throw err
      }
    },
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!publicClient,
  })

  return { hasEip1559Support: data ?? undefined, ...rest }
}

const useBlockFeeData = (
  publicClient: PublicClient | undefined,
  tx: TransactionRequest | undefined,
  withFeeOptions: boolean | undefined
) => {
  const { data, ...rest } = useQuery({
    queryKey: [
      "block",
      publicClient?.chain?.id,
      tx && serializeTransactionRequest(tx),
      withFeeOptions,
    ],
    queryFn: async () => {
      if (!publicClient?.chain?.id || !tx) return null

      // estimate gas without any gas or nonce setting to prevent rpc from validating these
      const { from: account, to, value, data } = tx

      const [
        gasPrice,
        { gasLimit: blockGasLimit, baseFeePerGas, gasUsed, number: blockNumber },
        feeHistoryAnalysis,
        estimatedGas,
      ] = await Promise.all([
        publicClient.getGasPrice(),
        publicClient.getBlock({ blockTag: "latest" }),
        withFeeOptions ? getFeeHistoryAnalysis(publicClient) : undefined,
        // estimate gas may change over time for contract calls, so we need to refresh it every time we prepare the tx to prevent an invalid transaction
        publicClient.estimateGas({ account, to, value, data }),
      ])

      if (feeHistoryAnalysis && !UNRELIABLE_GASPRICE_NETWORK_IDS.includes(publicClient.chain.id)) {
        // minimum maxPriorityPerGas value required to be considered valid into next block is equal to `gasPrice - baseFee`
        let minimumMaxPriorityFeePerGas = gasPrice - (baseFeePerGas ?? 0n)
        if (minimumMaxPriorityFeePerGas < 0n) {
          // on a busy network, when there is a sudden lowering of amount of transactions, it can happen that baseFeePerGas is higher than gPrice
          minimumMaxPriorityFeePerGas = 0n
        }

        // if feeHistory is invalid (network is inactive), use minimumMaxPriorityFeePerGas for all options.
        // else if feeHistory is valid but network usage below 80% (active but not busy), use it for the low priority option if lower
        // this prevents paying to much fee based on historical data when other users are setting unnecessarily high fees on their transactions.
        if (!feeHistoryAnalysis.isValid) {
          feeHistoryAnalysis.maxPriorityPerGasOptions.low = minimumMaxPriorityFeePerGas
          feeHistoryAnalysis.maxPriorityPerGasOptions.medium = minimumMaxPriorityFeePerGas
          feeHistoryAnalysis.maxPriorityPerGasOptions.high = minimumMaxPriorityFeePerGas
        } else if (
          feeHistoryAnalysis.avgGasUsedRatio !== null &&
          feeHistoryAnalysis.avgGasUsedRatio < 0.8
        )
          feeHistoryAnalysis.maxPriorityPerGasOptions.low =
            minimumMaxPriorityFeePerGas < feeHistoryAnalysis.maxPriorityPerGasOptions.low
              ? minimumMaxPriorityFeePerGas
              : feeHistoryAnalysis.maxPriorityPerGasOptions.low
      }

      const networkUsage =
        !gasUsed || !blockGasLimit ? undefined : Number((gasUsed * 100n) / blockGasLimit) / 100

      return {
        estimatedGas,
        gasPrice,
        baseFeePerGas,
        blockGasLimit,
        networkUsage,
        feeHistoryAnalysis,
        blockNumber,
      }
    },
    enabled: !!tx && !!publicClient && withFeeOptions !== undefined,
    refetchInterval: 6_000,
    retry: false,
  })

  const allProps = data || {
    estimatedGas: undefined,
    gasPrice: undefined,
    baseFeePerGas: undefined,
    blockGasLimit: undefined,
    networkUsage: undefined,
    feeHistoryAnalysis: undefined,
    blockNumber: undefined,
  }

  return {
    ...allProps,
    ...rest,
  }
}

const useTransactionInfo = (
  publicClient: PublicClient | undefined,
  tx: TransactionRequest | undefined
) => {
  const { data, ...rest } = useQuery({
    // check tx as boolean as it's not pure
    queryKey: ["transactionInfo", publicClient?.chain?.id, tx && serializeTransactionRequest(tx)],
    queryFn: async () => {
      if (!publicClient || !tx) return null
      return await getEthTransactionInfo(publicClient, tx)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false, // prevents error to be cleared when window gets focus
    enabled: !!publicClient && !!tx,
  })

  return { transactionInfo: data ?? undefined, ...rest }
}

const getEthGasSettingsFromTransaction = (
  tx: TransactionRequest | undefined,
  hasEip1559Support: boolean | undefined,
  estimatedGas: bigint | undefined,
  blockGasLimit: bigint | undefined,
  isContractCall: boolean | undefined = true // default to worse scenario
) => {
  if (
    !tx ||
    hasEip1559Support === undefined ||
    blockGasLimit === undefined ||
    estimatedGas === undefined
  )
    return undefined

  const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = tx
  const gas = getGasLimit(blockGasLimit, estimatedGas, tx, isContractCall)

  if (hasEip1559Support && gas && maxFeePerGas && maxPriorityFeePerGas) {
    return {
      type: "eip1559",
      gas,
      maxFeePerGas,
      maxPriorityFeePerGas,
    } as EthGasSettingsEip1559
  }

  if (!hasEip1559Support && gas && gasPrice) {
    return {
      type: "eip2930",
      gas,
      gasPrice,
    } as EthGasSettingsLegacy
  }

  return undefined
}

const useGasSettings = ({
  hasEip1559Support,
  baseFeePerGas,
  estimatedGas,
  gasPrice,
  blockGasLimit,
  feeHistoryAnalysis,
  priority,
  tx,
  isReplacement,
  isContractCall,
}: {
  hasEip1559Support: boolean | undefined
  baseFeePerGas: bigint | null | undefined
  estimatedGas: bigint | null | undefined
  gasPrice: bigint | null | undefined
  blockGasLimit: bigint | null | undefined
  feeHistoryAnalysis: FeeHistoryAnalysis | null | undefined
  priority: EthPriorityOptionName | undefined
  tx: TransactionRequest | undefined
  isReplacement: boolean | undefined
  isContractCall: boolean | undefined
}) => {
  const [customSettings, setCustomSettings] = useState<EthGasSettings>()

  const gasSettingsByPriority: GasSettingsByPriority | undefined = useMemo(() => {
    if (hasEip1559Support === undefined || !estimatedGas || !gasPrice || !blockGasLimit || !tx)
      return undefined
    const gas = getGasLimit(blockGasLimit, estimatedGas, tx, isContractCall)
    const suggestedSettings = getEthGasSettingsFromTransaction(
      tx,
      hasEip1559Support,
      estimatedGas,
      blockGasLimit,
      isContractCall
    )

    if (hasEip1559Support) {
      if (!feeHistoryAnalysis || !baseFeePerGas) return undefined

      const mapMaxPriority = feeHistoryAnalysis.maxPriorityPerGasOptions

      if (isReplacement && tx.maxPriorityFeePerGas !== undefined) {
        // for replacement transactions, ensure that maxPriorityFeePerGas is at least 10% higher than original tx
        const minimumMaxPriorityFeePerGas = (tx.maxPriorityFeePerGas * 110n) / 100n
        if (mapMaxPriority.low < minimumMaxPriorityFeePerGas)
          mapMaxPriority.low = minimumMaxPriorityFeePerGas
        if (mapMaxPriority.medium < minimumMaxPriorityFeePerGas)
          mapMaxPriority.medium = minimumMaxPriorityFeePerGas
        if (mapMaxPriority.high < minimumMaxPriorityFeePerGas)
          mapMaxPriority.high = minimumMaxPriorityFeePerGas
      }

      const low = getGasSettingsEip1559(baseFeePerGas, mapMaxPriority.low, gas)
      const medium = getGasSettingsEip1559(baseFeePerGas, mapMaxPriority.medium, gas)
      const high = getGasSettingsEip1559(baseFeePerGas, mapMaxPriority.high, gas)

      const custom: EthGasSettingsEip1559 =
        customSettings?.type === "eip1559"
          ? customSettings
          : suggestedSettings?.type === "eip1559"
          ? suggestedSettings
          : {
              ...low,
              // if network is idle, it makes sense to use baseFee as maxFee
              maxFeePerGas: feeHistoryAnalysis.isBaseFeeIdle ? baseFeePerGas : low.maxFeePerGas,
            }

      return {
        type: "eip1559",
        low,
        medium,
        high,
        custom,
      }
    }

    const recommendedSettings: EthGasSettingsLegacy = {
      type: "legacy",
      gas,
      // in some cases (ex: claiming bridged tokens on Polygon zkEVM),
      // 0 is provided by the dapp and has to be used for the tx to succeed
      gasPrice: tx.gasPrice === 0n ? 0n : gasPrice,
    }

    if (isReplacement && tx.gasPrice !== undefined) {
      // for replacement transactions, ensure that maxPriorityFeePerGas is at least 10% higher than original tx
      const minimumGasPrice = (tx.gasPrice * 110n) / 100n
      if (gasPrice < minimumGasPrice) recommendedSettings.gasPrice = minimumGasPrice
    }

    const custom: EthGasSettingsLegacy =
      customSettings?.type === "legacy"
        ? customSettings
        : suggestedSettings?.type === "legacy"
        ? suggestedSettings
        : recommendedSettings

    return {
      type: "legacy",
      recommended: recommendedSettings,
      custom,
    }
  }, [
    hasEip1559Support,
    estimatedGas,
    gasPrice,
    blockGasLimit,
    tx,
    isContractCall,
    isReplacement,
    customSettings,
    feeHistoryAnalysis,
    baseFeePerGas,
  ])

  const gasSettings = useMemo(() => {
    if (gasSettingsByPriority?.type === "eip1559")
      return gasSettingsByPriority[priority as EthPriorityOptionNameEip1559]
    if (gasSettingsByPriority?.type === "legacy")
      return gasSettingsByPriority[priority as EthPriorityOptionNameLegacy]
    return undefined
  }, [gasSettingsByPriority, priority])

  return {
    gasSettingsByPriority,
    gasSettings,
    setCustomSettings,
  }
}

export const useEthTransaction = (
  tx: TransactionRequest | undefined,
  evmNetworkId: EvmNetworkId | undefined,
  lockTransaction = false,
  isReplacement = false
) => {
  useAlec("tx", tx)
  const publicClient = usePublicClient(evmNetworkId)
  useAlec("publicClient", publicClient)
  const { transactionInfo, error: errorTransactionInfo } = useTransactionInfo(publicClient, tx)
  const { hasEip1559Support, error: errorEip1559Support } = useHasEip1559Support(publicClient)
  useAlec("hasEip1559Support", hasEip1559Support)
  useAlec("errorEip1559Support", errorEip1559Support)
  const { nonce, error: nonceError } = useNonce(
    tx?.from as `0x${string}` | undefined,
    evmNetworkId,
    isReplacement && tx?.nonce ? tx.nonce : undefined
  )
  useAlec("nonce", nonce)
  useAlec("nonceError", nonceError)
  const {
    gasPrice,
    networkUsage,
    baseFeePerGas,
    blockGasLimit,
    feeHistoryAnalysis,
    estimatedGas,
    error: blockFeeDataError,
  } = useBlockFeeData(publicClient, tx, hasEip1559Support)
  useAlec("gasPrice", gasPrice)
  useAlec("networkUsage", networkUsage)
  useAlec("baseFeePerGas", baseFeePerGas)
  useAlec("blockGasLimit", blockGasLimit)
  useAlec("feeHistoryAnalysis", feeHistoryAnalysis)
  useAlec("estimatedGas", estimatedGas)
  useAlec("blockFeeDataError", blockFeeDataError)

  const [priority, setPriority] = useState<EthPriorityOptionName>()

  // reset priority in case chain changes
  // ex: from send funds when switching from BSC (legacy) to mainnet (eip1559)
  useEffect(() => {
    setPriority(undefined)
  }, [evmNetworkId])

  // set default priority based on EIP1559 support
  useEffect(() => {
    if (priority !== undefined || hasEip1559Support === undefined) return
    setPriority(hasEip1559Support ? "low" : "recommended")
  }, [hasEip1559Support, isReplacement, priority])

  const { gasSettings, setCustomSettings, gasSettingsByPriority } = useGasSettings({
    tx: tx,
    priority,
    hasEip1559Support,
    baseFeePerGas,
    estimatedGas,
    gasPrice,
    blockGasLimit,
    feeHistoryAnalysis,
    isReplacement,
    isContractCall: transactionInfo?.isContractCall,
  })

  const liveUpdatingTransaction = useMemo(() => {
    if (!publicClient || !tx || !gasSettings || nonce === undefined) return undefined
    return prepareTransaction(tx, gasSettings, nonce)
  }, [gasSettings, publicClient, tx, nonce])

  // transaction may be locked once sent to hardware device for signing
  const [transaction, setTransaction] = useState(liveUpdatingTransaction)

  useEffect(() => {
    if (!lockTransaction) setTransaction(liveUpdatingTransaction)
  }, [liveUpdatingTransaction, lockTransaction])

  // TODO replace this wierd object name with something else... gasInfo ?
  const txDetails: EthTransactionDetails | undefined = useMemo(() => {
    if (!evmNetworkId || !gasPrice || !estimatedGas || !transaction || !gasSettings)
      return undefined

    // if eip1559 transaction, wait for baseFee to be available
    if (gasSettings?.type === "eip1559" && !baseFeePerGas) return undefined

    const { estimatedFee, maxFee } = getTotalFeesFromGasSettings(
      gasSettings,
      estimatedGas,
      baseFeePerGas
    )

    return {
      evmNetworkId,
      estimatedGas,
      gasPrice,
      baseFeePerGas,
      estimatedFee,
      maxFee,
      baseFeeTrend: feeHistoryAnalysis?.baseFeeTrend,
    }
  }, [
    baseFeePerGas,
    estimatedGas,
    evmNetworkId,
    feeHistoryAnalysis?.baseFeeTrend,
    gasPrice,
    gasSettings,
    transaction,
  ])

  // use staleIsValid to prevent disabling approve button each time there is a new block (triggers gas check)
  const { isValid, error: isValidError } = useIsValidEthTransaction(
    publicClient,
    transaction,
    priority
  )

  const { t } = useTranslation("request")
  const { error, errorDetails } = useMemo(() => {
    const anyError = (errorEip1559Support ??
      nonceError ??
      blockFeeDataError ??
      errorTransactionInfo ??
      isValidError) as Error & { code?: string; error?: Error }

    const userFriendlyError = getEthersErrorLabelFromCode(anyError?.code)

    // if ethers.js error, display underlying error that shows the RPC's error message
    const errorToDisplay = anyError?.error ?? anyError

    if (errorToDisplay)
      return {
        error: userFriendlyError ?? t("Failed to prepare transaction"),
        errorDetails: errorToDisplay.message,
      }

    return { error: undefined, errorDetails: undefined }
  }, [blockFeeDataError, isValidError, errorEip1559Support, errorTransactionInfo, nonceError, t])

  const isLoading = useMemo(
    () => tx && !transactionInfo && !txDetails && !error,
    [tx, transactionInfo, txDetails, error]
  )

  useAlec("transactionInfo", transactionInfo)
  useAlec("transaction", transaction)
  useAlec("txDetails", txDetails)
  useAlec("gasSettings", gasSettings)
  useAlec("gasSettingsByPriority", gasSettingsByPriority)

  return {
    transactionInfo,
    transaction,
    txDetails,
    gasSettings,
    priority,
    setPriority,
    isLoading,
    isValid,
    error,
    errorDetails,
    networkUsage,
    setCustomSettings,
    gasSettingsByPriority,
  }
}
