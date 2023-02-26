import {
  getGasLimit,
  getGasSettingsEip1559,
  getTotalFeesFromGasSettings,
  prepareTransaction,
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
import {
  TransactionInfo as TransactionType,
  getEthTransactionInfo,
} from "@core/util/getEthTransactionInfo"
import { FeeHistoryAnalysis, getFeeHistoryAnalysis } from "@core/util/getFeeHistoryAnalysis"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useEthereumProvider } from "@ui/domains/Ethereum/useEthereumProvider"
import { BigNumber, ethers } from "ethers"
import { default as debounce } from "lodash/debounce"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useIsValidEthTransaction } from "./Sign/useIsValidEthTransaction"

// gasPrice isn't reliable on polygon & mumbai, see https://github.com/ethers-io/ethers.js/issues/2828#issuecomment-1283014250
const UNRELIABLE_GASPRICE_NETWORK_IDS = [137, 80001]

const useNonce = (address?: string, evmNetworkId?: EvmNetworkId) => {
  const { data, ...rest } = useQuery({
    queryKey: ["nonce", address, evmNetworkId],
    queryFn: () => {
      return address && evmNetworkId ? api.ethGetTransactionsCount(address, evmNetworkId) : null
    },
  })

  return { nonce: data ?? undefined, ...rest }
}

const useHasEip1559Support = (provider?: ethers.providers.JsonRpcProvider) => {
  const { data, ...rest } = useQuery({
    queryKey: ["hasEip1559Support", provider?.network?.chainId],
    queryFn: async () => {
      if (!provider) return null
      const { baseFeePerGas } = await provider.send("eth_getBlockByNumber", ["latest", false])
      return baseFeePerGas !== undefined
    },
    refetchInterval: false,
  })

  return { hasEip1559Support: data ?? undefined, ...rest }
}

const useEstimatedGas = (
  provider?: ethers.providers.JsonRpcProvider,
  tx?: ethers.providers.TransactionRequest
) => {
  return useQuery({
    queryKey: ["estimateGas", provider?.network?.chainId, tx],
    queryFn: async () => {
      if (!provider || !tx) return null
      try {
        // ignore gas settings set by dapp
        const { gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas, ...rest } = tx
        return await provider.estimateGas(rest)
      } catch (err) {
        // if ethers.js error, throw underlying error that has the real error message
        throw (err as any)?.error ?? err
      }
    },
    refetchOnWindowFocus: false, // prevents error to be cleared when window gets focus
    retry: false,
  })
}

const useBlockFeeData = (provider?: ethers.providers.JsonRpcProvider, withFeeOptions?: boolean) => {
  const { data, ...rest } = useQuery({
    queryKey: ["block", provider?.network?.chainId],
    queryFn: async () => {
      if (!provider) return null

      const [
        gasPrice,
        { gasLimit: blockGasLimit, baseFeePerGas, gasUsed, number: blockNumber },
        feeHistoryAnalysis,
      ] = await Promise.all([
        provider.getGasPrice(),
        provider.getBlock("latest"),
        withFeeOptions ? getFeeHistoryAnalysis(provider) : undefined,
      ])

      if (
        feeHistoryAnalysis &&
        !UNRELIABLE_GASPRICE_NETWORK_IDS.includes(provider.network.chainId)
      ) {
        // minimum maxPriorityPerGas value required to be considered valid into next block is equal to `gasPrice - baseFee`
        let minimumMaxPriorityFeePerGas = gasPrice.sub(baseFeePerGas ?? 0)
        if (minimumMaxPriorityFeePerGas.lt(0)) {
          // on a busy network, when there is a sudden lowering of amount of transactions, it can happen that baseFeePerGas is higher than gPrice
          minimumMaxPriorityFeePerGas = BigNumber.from("0")
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
          feeHistoryAnalysis.maxPriorityPerGasOptions.low = minimumMaxPriorityFeePerGas.lt(
            feeHistoryAnalysis.maxPriorityPerGasOptions.low
          )
            ? minimumMaxPriorityFeePerGas
            : feeHistoryAnalysis.maxPriorityPerGasOptions.low
      }

      const networkUsage =
        !gasUsed || !blockGasLimit
          ? undefined
          : gasUsed.mul(100).div(blockGasLimit).toNumber() / 100

      return {
        gasPrice,
        baseFeePerGas,
        blockGasLimit,
        networkUsage,
        feeHistoryAnalysis,
        blockNumber,
      }
    },
    refetchInterval: 6_000,
    retry: false,
  })

  const allProps = data || {
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
  provider?: ethers.providers.JsonRpcProvider,
  tx?: ethers.providers.TransactionRequest
) => {
  const { data, ...rest } = useQuery({
    // check tx as boolean as it's not pure
    queryKey: ["transactionInfo", provider?.network?.chainId, tx],
    queryFn: async () => {
      if (!provider || !tx) return null
      return await getEthTransactionInfo(provider, tx)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false, // prevents error to be cleared when window gets focus
  })

  return { transactionInfo: data ?? undefined, ...rest }
}

const getEthGasSettingsFromTransaction = (
  tx?: ethers.providers.TransactionRequest,
  hasEip1559Support?: boolean,
  estimatedGas?: BigNumber,
  blockGasLimit?: BigNumber
) => {
  if (!tx || hasEip1559Support === undefined || !blockGasLimit || !estimatedGas) return undefined

  const { gasLimit: suggestedGasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas } = tx
  const gasLimit = getGasLimit(blockGasLimit, estimatedGas, suggestedGasLimit)

  if (hasEip1559Support && gasLimit && maxFeePerGas && maxPriorityFeePerGas) {
    return {
      type: 2,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
    } as EthGasSettingsEip1559
  }

  if (!hasEip1559Support && gasLimit && gasPrice) {
    return {
      type: 0,
      gasLimit,
      gasPrice,
    } as EthGasSettingsLegacy
  }

  return undefined
}

const usePerPriorityGasSettings = ({
  hasEip1559Support,
  baseFeePerGas,
  estimatedGas,
  gasPrice,
  blockGasLimit,
  feeHistoryAnalysis,
  priority,
  tx,
}: {
  hasEip1559Support?: boolean
  baseFeePerGas?: BigNumber | null
  estimatedGas?: BigNumber | null
  gasPrice?: BigNumber | null
  blockGasLimit?: BigNumber | null
  feeHistoryAnalysis?: FeeHistoryAnalysis | null
  priority?: EthPriorityOptionName
  tx?: ethers.providers.TransactionRequest
}) => {
  // TODO init with values from tx (supplied by dapp)
  const [customSettings, setCustomSettings] = useState<EthGasSettings>()

  const gasSettingsByPriority: GasSettingsByPriority | undefined = useMemo(() => {
    if (hasEip1559Support === undefined || !estimatedGas || !gasPrice || !blockGasLimit || !tx)
      return undefined

    const gasLimit = getGasLimit(blockGasLimit, estimatedGas, tx.gasLimit)
    const suggestedSettings = getEthGasSettingsFromTransaction(
      tx,
      hasEip1559Support,
      estimatedGas,
      blockGasLimit
    )

    if (hasEip1559Support) {
      if (!feeHistoryAnalysis || !baseFeePerGas) return undefined

      const mapMaxPriority = feeHistoryAnalysis.maxPriorityPerGasOptions

      const low = getGasSettingsEip1559(baseFeePerGas, mapMaxPriority.low, gasLimit)
      const medium = getGasSettingsEip1559(baseFeePerGas, mapMaxPriority.medium, gasLimit)
      const high = getGasSettingsEip1559(baseFeePerGas, mapMaxPriority.high, gasLimit)

      const custom: EthGasSettingsEip1559 =
        customSettings?.type === 2
          ? customSettings
          : suggestedSettings?.type === 2
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
      type: 0,
      gasPrice,
      gasLimit,
    }

    const custom: EthGasSettingsLegacy =
      customSettings?.type === 0
        ? customSettings
        : suggestedSettings?.type === 0
        ? suggestedSettings
        : recommendedSettings

    // TODO ideally would be a different type with just 2 properties, but that's enough complexity for now
    return {
      type: "legacy",
      recommended: recommendedSettings,
      custom,
    }
  }, [
    baseFeePerGas,
    blockGasLimit,
    customSettings,
    estimatedGas,
    feeHistoryAnalysis,
    gasPrice,
    hasEip1559Support,
    tx,
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
  tx?: ethers.providers.TransactionRequest,
  lockTransaction = false
) => {
  const provider = useEthereumProvider(tx?.chainId?.toString())
  const { transactionInfo, error: errorTransactionInfo } = useTransactionInfo(provider, tx)
  const { hasEip1559Support, error: errorEip1559Support } = useHasEip1559Support(provider)
  const { nonce, error: nonceError } = useNonce(tx?.from, tx?.chainId?.toString())
  const { data: estimatedGas, error: estimatedGasError } = useEstimatedGas(provider, tx)

  const {
    gasPrice,
    networkUsage,
    baseFeePerGas,
    blockGasLimit,
    feeHistoryAnalysis,
    error: blockFeeDataError,
  } = useBlockFeeData(provider, hasEip1559Support)

  const [priority, setPriority] = useState<EthPriorityOptionName>()

  // set default priority based on EIP1559 support
  useEffect(() => {
    if (priority !== undefined || hasEip1559Support === undefined) return
    setPriority(hasEip1559Support ? "low" : "recommended")
  }, [hasEip1559Support, priority])

  const { gasSettings, setCustomSettings, gasSettingsByPriority } = usePerPriorityGasSettings({
    tx,
    priority,
    hasEip1559Support,
    baseFeePerGas,
    estimatedGas,
    gasPrice,
    blockGasLimit,
    feeHistoryAnalysis,
  })

  const liveUpdatingTransaction = useMemo(() => {
    if (!provider || !tx || !gasSettings || nonce === undefined) return undefined
    return prepareTransaction(tx, gasSettings, nonce)
  }, [gasSettings, provider, tx, nonce])

  // transaction may be locked once sent to hardware device for signing
  const [transaction, setTransaction] = useState(liveUpdatingTransaction)

  useEffect(() => {
    if (!lockTransaction) setTransaction(liveUpdatingTransaction)
  }, [liveUpdatingTransaction, lockTransaction])

  // TODO replace this wierd object name with something else... gasInfo ?
  const txDetails: EthTransactionDetails | undefined = useMemo(() => {
    if (!gasPrice || !estimatedGas || !transaction || !gasSettings) return undefined

    // if type 2 transaction, wait for baseFee to be available
    if (gasSettings?.type === 2 && !baseFeePerGas) return undefined

    const { estimatedFee, maxFee } = getTotalFeesFromGasSettings(
      gasSettings,
      estimatedGas,
      baseFeePerGas
    )

    return {
      estimatedGas,
      gasPrice,
      baseFeePerGas,
      estimatedFee,
      maxFee,
      baseFeeTrend: feeHistoryAnalysis?.baseFeeTrend,
    }
  }, [baseFeePerGas, estimatedGas, feeHistoryAnalysis, gasPrice, gasSettings, transaction])

  // use staleIsValid to prevent disabling approve button each time there is a new block (triggers gas check)
  const { staleIsValid: isValid, error: isValidError } = useIsValidEthTransaction(
    provider,
    transaction,
    priority
  )

  const { error, errorDetails } = useMemo(() => {
    const networkError =
      errorEip1559Support || nonceError || blockFeeDataError || errorTransactionInfo
    if (networkError)
      return { error: "Network error", errorDetails: (networkError as Error).message }

    const validationError = (estimatedGasError || isValidError) as Error
    if (validationError) {
      if (validationError?.message?.startsWith("insufficient funds for intrinsic transaction cost"))
        return { error: "Insufficient balance", errorDetails: validationError.message }

      return { error: "Invalid transaction", errorDetails: validationError.message }
    }

    return { error: undefined, errorDetails: undefined }
  }, [
    blockFeeDataError,
    isValidError,
    errorEip1559Support,
    errorTransactionInfo,
    estimatedGasError,
    nonceError,
  ])

  const isLoading = useMemo(
    () => tx && !transactionInfo && !txDetails && !error,
    [tx, transactionInfo, txDetails, error]
  )

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
