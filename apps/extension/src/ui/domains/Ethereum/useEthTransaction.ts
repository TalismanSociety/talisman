import { getEthersErrorLabelFromCode } from "@core/domains/ethereum/errors"
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
import { ETH_ERROR_EIP1474_METHOD_NOT_FOUND } from "@core/injectEth/EthProviderRpcError"
import { getEthTransactionInfo } from "@core/util/getEthTransactionInfo"
import { FeeHistoryAnalysis, getFeeHistoryAnalysis } from "@core/util/getFeeHistoryAnalysis"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useEthereumProvider } from "@ui/domains/Ethereum/useEthereumProvider"
import { BigNumber, ethers } from "ethers"
import { useEffect, useMemo, useState } from "react"

import { useIsValidEthTransaction } from "../Sign/Ethereum/useIsValidEthTransaction"

// gasPrice isn't reliable on polygon & mumbai, see https://github.com/ethers-io/ethers.js/issues/2828#issuecomment-1283014250
const UNRELIABLE_GASPRICE_NETWORK_IDS = [137, 80001]

const useNonce = (address?: string, evmNetworkId?: EvmNetworkId, forcedValue?: number) => {
  const { data, ...rest } = useQuery({
    queryKey: ["nonce", address, evmNetworkId],
    queryFn: () => {
      return address && evmNetworkId ? api.ethGetTransactionsCount(address, evmNetworkId) : null
    },
    enabled: forcedValue === undefined, // don't bother fetching if value is forced
  })

  return { nonce: forcedValue ?? data ?? undefined, ...rest }
}

const useHasEip1559Support = (provider?: ethers.providers.JsonRpcProvider) => {
  const { data, ...rest } = useQuery({
    queryKey: ["hasEip1559Support", provider?.network?.chainId],
    queryFn: async () => {
      if (!provider) return null

      try {
        const [{ baseFeePerGas }] = await Promise.all([
          // check that block has a baseFeePerGas
          provider.send("eth_getBlockByNumber", ["latest", false]),
          // check that method eth_feeHistory exists. This will throw with code -32601 if it doesn't.
          provider.send("eth_feeHistory", [ethers.utils.hexValue(1), "latest", [10]]),
        ])
        return baseFeePerGas !== undefined
      } catch (err) {
        const error = err as Error & { code?: number }
        if (error.code === ETH_ERROR_EIP1474_METHOD_NOT_FOUND) return false

        throw err
      }
    },
    refetchInterval: false,
  })

  return { hasEip1559Support: data ?? undefined, ...rest }
}

const useBlockFeeData = (
  provider?: ethers.providers.JsonRpcProvider,
  tx?: ethers.providers.TransactionRequest,
  withFeeOptions?: boolean
) => {
  const { data, ...rest } = useQuery({
    queryKey: ["block", provider?.network?.chainId, tx, withFeeOptions],
    queryFn: async () => {
      if (!provider || !tx) return null
      const [
        gasPrice,
        { gasLimit: blockGasLimit, baseFeePerGas, gasUsed, number: blockNumber },
        feeHistoryAnalysis,
        estimatedGas,
      ] = await Promise.all([
        provider.getGasPrice(),
        provider.getBlock("latest"),
        withFeeOptions ? getFeeHistoryAnalysis(provider) : undefined,
        // estimate gas may change over time for contract calls, so we need to refresh it every time we prepare the tx to prevent an invalid transaction
        provider.estimateGas({
          ...tx,
          type: undefined,
          gasPrice: undefined,
          maxPriorityFeePerGas: undefined,
          maxFeePerGas: undefined,
          gasLimit: undefined,
        }),
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
        estimatedGas,
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

  const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = tx
  const gasLimit = getGasLimit(blockGasLimit, estimatedGas, tx)

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
}: {
  hasEip1559Support?: boolean
  baseFeePerGas?: BigNumber | null
  estimatedGas?: BigNumber | null
  gasPrice?: BigNumber | null
  blockGasLimit?: BigNumber | null
  feeHistoryAnalysis?: FeeHistoryAnalysis | null
  priority?: EthPriorityOptionName
  tx?: ethers.providers.TransactionRequest
  isReplacement?: boolean
}) => {
  // TODO init with values from tx (supplied by dapp)
  const [customSettings, setCustomSettings] = useState<EthGasSettings>()

  const gasSettingsByPriority: GasSettingsByPriority | undefined = useMemo(() => {
    if (hasEip1559Support === undefined || !estimatedGas || !gasPrice || !blockGasLimit || !tx)
      return undefined
    const gasLimit = getGasLimit(blockGasLimit, estimatedGas, tx)
    const suggestedSettings = getEthGasSettingsFromTransaction(
      tx,
      hasEip1559Support,
      estimatedGas,
      blockGasLimit
    )

    if (hasEip1559Support) {
      if (!feeHistoryAnalysis || !baseFeePerGas) return undefined

      const mapMaxPriority = feeHistoryAnalysis.maxPriorityPerGasOptions

      if (isReplacement) {
        // for replacement transactions, ensure that maxPriorityFeePerGas is at least 10% higher than original tx
        const minimumMaxPriorityFeePerGas = ethers.BigNumber.from(tx.maxPriorityFeePerGas)
          .mul(110)
          .div(100)
        if (mapMaxPriority.low.lt(minimumMaxPriorityFeePerGas))
          mapMaxPriority.low = minimumMaxPriorityFeePerGas
        if (mapMaxPriority.medium.lt(minimumMaxPriorityFeePerGas))
          mapMaxPriority.medium = minimumMaxPriorityFeePerGas
        if (mapMaxPriority.high.lt(minimumMaxPriorityFeePerGas))
          mapMaxPriority.high = minimumMaxPriorityFeePerGas
      }

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
      gasLimit,
      // in some cases (ex: claiming bridged tokens on Polygon zkEVM),
      // 0 is provided by the dapp and has to be used for the tx to succeed
      gasPrice: tx.gasPrice && BigNumber.from(tx.gasPrice).isZero() ? BigNumber.from(0) : gasPrice,
    }

    if (isReplacement) {
      // for replacement transactions, ensure that maxPriorityFeePerGas is at least 10% higher than original tx
      const minimumGasPrice = ethers.BigNumber.from(tx.gasPrice).mul(110).div(100)
      if (ethers.BigNumber.from(gasPrice).lt(minimumGasPrice))
        recommendedSettings.gasPrice = minimumGasPrice
    }

    const custom: EthGasSettingsLegacy =
      customSettings?.type === 0
        ? customSettings
        : suggestedSettings?.type === 0
        ? suggestedSettings
        : recommendedSettings

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
    isReplacement,
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
  lockTransaction = false,
  isReplacement = false
) => {
  const provider = useEthereumProvider(tx?.chainId?.toString())
  const { transactionInfo, error: errorTransactionInfo } = useTransactionInfo(provider, tx)
  const { hasEip1559Support, error: errorEip1559Support } = useHasEip1559Support(provider)
  const { nonce, error: nonceError } = useNonce(
    tx?.from,
    tx?.chainId?.toString(),
    isReplacement && tx?.nonce ? BigNumber.from(tx.nonce).toNumber() : undefined
  )

  const {
    gasPrice,
    networkUsage,
    baseFeePerGas,
    blockGasLimit,
    feeHistoryAnalysis,
    estimatedGas,
    error: blockFeeDataError,
  } = useBlockFeeData(provider, tx, hasEip1559Support)

  const [priority, setPriority] = useState<EthPriorityOptionName>()

  // reset priority in case chain changes
  // ex: from send funds when switching from BSC (legacy) to mainnet (eip1559)
  useEffect(() => {
    setPriority(undefined)
  }, [tx?.chainId])

  // set default priority based on EIP1559 support
  useEffect(() => {
    if (priority !== undefined || hasEip1559Support === undefined) return
    setPriority(hasEip1559Support ? "low" : "recommended")
  }, [hasEip1559Support, isReplacement, priority])

  const { gasSettings, setCustomSettings, gasSettingsByPriority } = useGasSettings({
    tx,
    priority,
    hasEip1559Support,
    baseFeePerGas,
    estimatedGas,
    gasPrice,
    blockGasLimit,
    feeHistoryAnalysis,
    isReplacement,
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
  const { isValid, error: isValidError } = useIsValidEthTransaction(provider, transaction, priority)

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
        error: userFriendlyError ?? "Failed to prepare transaction",
        errorDetails: errorToDisplay.message,
      }

    return { error: undefined, errorDetails: undefined }
  }, [blockFeeDataError, isValidError, errorEip1559Support, errorTransactionInfo, nonceError])

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
