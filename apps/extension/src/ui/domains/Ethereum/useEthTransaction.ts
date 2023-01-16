import {
  getGasLimit,
  getGasSettingsEip1559,
  getLegacyTotalFees,
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
import { useCallback, useEffect, useMemo, useState } from "react"

// gasPrice isn't reliable on polygon & mumbai, see https://github.com/ethers-io/ethers.js/issues/2828#issuecomment-1283014250
const UNRELIABLE_GASPRICE_NETWORK_IDS = [137, 80001]

const useNonce = (address?: string, evmNetworkId?: EvmNetworkId) => {
  const [nonce, setNonce] = useState<number>()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    setIsLoading(true)
    setError(undefined)
    setNonce(undefined)

    if (address && evmNetworkId)
      api
        .ethGetTransactionsCount(address, evmNetworkId)
        .then(setNonce)
        .catch(() => setError("Failed to load nonce"))
        .finally(() => setIsLoading(false))
  }, [address, evmNetworkId])

  return { nonce, isLoading, error }
}

const useHasEip1559Support = (provider?: ethers.providers.JsonRpcProvider) => {
  // initialize with undefined, which is used to trigger the check
  const [hasEip1559Support, setHasEip1559Support] = useState<boolean>()
  const [isLoading, setIsLoading] = useState<boolean>()
  const [error, setError] = useState<string>()

  const checkEip1559Support = useCallback(async () => {
    setHasEip1559Support(undefined)

    if (!provider) return
    setIsLoading(true)
    setError(undefined)

    try {
      const { baseFeePerGas } = await provider.send("eth_getBlockByNumber", ["latest", false])
      setHasEip1559Support(baseFeePerGas !== undefined)
    } catch (err) {
      setError("Failed to check EIP-1559 support")
    }
    setIsLoading(false)
  }, [provider])

  useEffect(() => {
    // if provider changes, reset
    setHasEip1559Support(undefined)
  }, [provider])

  useEffect(() => {
    // if value is unknown, fetch it
    if (hasEip1559Support === undefined) checkEip1559Support()
  }, [checkEip1559Support, hasEip1559Support])

  return { hasEip1559Support, isLoading, error }
}

const useEstimatedGas = (
  provider?: ethers.providers.JsonRpcProvider,
  tx?: ethers.providers.TransactionRequest
) => {
  return useQuery({
    queryKey: ["estimateGas", provider?.network?.chainId, tx],
    queryFn: () => {
      if (!provider || !tx) return null
      // ignore gas settings set by dapp
      const { gasLimit, gasPrice, maxFeePerGas, maxPriorityFeePerGas, ...rest } = tx
      return provider.estimateGas(rest)
    },
    refetchOnWindowFocus: false, // prevents error to be cleared when window gets focus
  })
}

const useBlockFeeData = (provider?: ethers.providers.JsonRpcProvider, withFeeOptions?: boolean) => {
  const [gasPrice, setGasPrice] = useState<BigNumber | null>()
  const [baseFeePerGas, setBaseFeePerGas] = useState<BigNumber | null>()
  const [gasUsed, setGasUsed] = useState<BigNumber | null>()
  const [blockGasLimit, setBlockGasLimit] = useState<BigNumber | null>()
  const [feeHistoryAnalysis, setFeeHistoryAnalysis] = useState<FeeHistoryAnalysis | null>()
  const [error, setError] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)

  // analyse fees on each block
  useEffect(() => {
    // check that withFeeOptions is defined to prevent "gas flickering" on initial load
    if (!provider || withFeeOptions === undefined) {
      setGasPrice(undefined)
      setBaseFeePerGas(undefined)
      setBlockGasLimit(undefined)
      setGasUsed(undefined)
      setFeeHistoryAnalysis(undefined)
      setError(undefined)
      return
    }

    // local lock used to prevent block data to be fetched sequentially
    // we may skip blocks, but they won't be overriden with data from previous ones
    // important on fast L2 networks such as arbitrum and polygon
    let isBusy = false

    const handleBlock = async (blockNumber?: number) => {
      if (isBusy) return
      isBusy = true

      setIsLoading(true)
      try {
        const [gPrice, { gasLimit, baseFeePerGas, gasUsed }, feeOptions] = await Promise.all([
          provider.getGasPrice(),
          provider.getBlock("latest"),
          withFeeOptions ? getFeeHistoryAnalysis(provider) : undefined,
        ])

        if (feeOptions && !UNRELIABLE_GASPRICE_NETWORK_IDS.includes(provider.network.chainId)) {
          // minimum maxPriorityPerGas value required to be considered valid into next block is equal to `gasPrice - baseFee`
          let minimumMaxPriorityFeePerGas = gPrice.sub(baseFeePerGas ?? 0)
          if (minimumMaxPriorityFeePerGas.lt(0)) {
            // on a busy network, when there is a sudden lowering of amount of transactions, it can happen that baseFeePerGas is higher than gPrice
            minimumMaxPriorityFeePerGas = BigNumber.from("0")
          }

          // if feeHistory is invalid (network is inactive), use minimumMaxPriorityFeePerGas for all options.
          // else if feeHistory is valid but network usage below 80% (active but not busy), use it for the low priority option if lower
          // this prevents paying to much fee based on historical data when other users are setting unnecessarily high fees on their transactions.
          if (!feeOptions.isValid) {
            feeOptions.maxPriorityPerGasOptions.low = minimumMaxPriorityFeePerGas
            feeOptions.maxPriorityPerGasOptions.medium = minimumMaxPriorityFeePerGas
            feeOptions.maxPriorityPerGasOptions.high = minimumMaxPriorityFeePerGas
          } else if (feeOptions.avgGasUsedRatio !== null && feeOptions.avgGasUsedRatio < 0.8)
            feeOptions.maxPriorityPerGasOptions.low = minimumMaxPriorityFeePerGas.lt(
              feeOptions.maxPriorityPerGasOptions.low
            )
              ? minimumMaxPriorityFeePerGas
              : feeOptions.maxPriorityPerGasOptions.low
        }

        setGasPrice(gPrice)
        setBaseFeePerGas(baseFeePerGas)
        setBlockGasLimit(gasLimit)
        setGasUsed(gasUsed)
        setFeeHistoryAnalysis(feeOptions)
        setError(undefined)
      } catch (err) {
        setError((err as Error).message)
      }
      setIsLoading(false)
      isBusy = false
    }

    provider.on("block", handleBlock)

    //init
    handleBlock()

    return () => {
      provider.off("block", handleBlock)
    }
  }, [provider, withFeeOptions])

  const blockGasUsedRatio = useMemo(() => {
    if (!gasUsed || !blockGasLimit) return undefined
    return gasUsed.mul(100).div(blockGasLimit).toNumber() / 100
  }, [blockGasLimit, gasUsed])

  return {
    gasPrice,
    baseFeePerGas,
    blockGasUsedRatio,
    blockGasLimit,
    feeHistoryAnalysis,
    isLoading,
    error,
  }
}

const useTransactionInfo = (
  provider?: ethers.providers.Provider,
  tx?: ethers.providers.TransactionRequest
) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [transactionInfo, setTransactionInfo] = useState<TransactionType>()

  useEffect(() => {
    if (!provider || !tx) return
    setIsLoading(true)
    getEthTransactionInfo(provider, tx)
      .then(setTransactionInfo)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [provider, tx])

  return { isLoading, transactionInfo, error: error?.message }
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
  priority: EthPriorityOptionName
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
      low: recommendedSettings,
      medium: recommendedSettings,
      high: recommendedSettings,
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

  const gasSettings = useMemo(
    () => gasSettingsByPriority?.[priority],
    [gasSettingsByPriority, priority]
  )

  return {
    gasSettingsByPriority,
    gasSettings,
    setCustomSettings,
  }
}

export const useEthTransaction = (
  tx?: ethers.providers.TransactionRequest,
  defaultPriority: EthPriorityOptionName = "low",
  lockTransaction = false
) => {
  const provider = useEthereumProvider(tx?.chainId?.toString())
  const { transactionInfo, error: errorTransactionInfo } = useTransactionInfo(provider, tx)
  const { hasEip1559Support, error: errorEip1559Support } = useHasEip1559Support(provider)
  const { nonce, error: nonceError } = useNonce(tx?.from, tx?.chainId?.toString())
  const { data: estimatedGas, error: estimatedGasError } = useEstimatedGas(provider, tx)

  const {
    gasPrice,
    blockGasUsedRatio: networkUsage,
    baseFeePerGas,
    blockGasLimit,
    feeHistoryAnalysis,
    error: blockFeeDataError,
  } = useBlockFeeData(provider, hasEip1559Support)

  const [priority, setPriority] = useState<EthPriorityOptionName>(defaultPriority)

  const { gasSettings, setCustomSettings, gasSettingsByPriority } = usePerPriorityGasSettings({
    hasEip1559Support,
    baseFeePerGas,
    estimatedGas,
    gasPrice,
    blockGasLimit,
    feeHistoryAnalysis,
    priority,
    tx,
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

  const error = useMemo(
    () =>
      errorEip1559Support ??
      (estimatedGasError as Error)?.message ??
      blockFeeDataError ??
      nonceError ??
      errorTransactionInfo,
    [blockFeeDataError, errorEip1559Support, errorTransactionInfo, estimatedGasError, nonceError]
  )

  const isLoading = useMemo(
    () => tx && !transactionInfo && !txDetails && !error,
    [tx, transactionInfo, txDetails, error]
  )

  const result = {
    transactionInfo,
    transaction,
    txDetails,
    gasSettings,
    priority,
    setPriority,
    isLoading,
    error,
    networkUsage,
    setCustomSettings,
    gasSettingsByPriority,
  }

  //console.log("useEthTransaction", result)

  return result
}
