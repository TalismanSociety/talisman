import { isBigInt } from "@talismn/util"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { encodeFunctionData, PublicClient, TransactionRequest } from "viem"

import {
  EthGasSettings,
  EthGasSettingsEip1559,
  EthGasSettingsLegacy,
  EthPriorityOptionName,
  EthPriorityOptionNameEip1559,
  EthPriorityOptionNameLegacy,
  EthTransactionDetails,
  EvmNetworkId,
  GasSettingsByPriority,
  getGasLimit,
  getGasSettingsEip1559,
  getHumanReadableErrorMessage,
  getTotalFeesFromGasSettings,
  isAcalaEvmPlus,
  prepareTransaction,
  serializeTransactionRequest,
} from "@extension/core"
import { api } from "@ui/api"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"

import { ETH_ERROR_EIP1474_METHOD_NOT_FOUND } from "../../../inject/ethereum/EthProviderRpcError"
import { useEthEstimateL1DataFee } from "./useEthEstimateL1DataFee"
import { useIsValidEthTransaction } from "./useIsValidEthTransaction"
import { decodeEvmTransaction } from "./util/decodeEvmTransaction"
import { FeeHistoryAnalysis, getFeeHistoryAnalysis } from "./util/getFeeHistoryAnalysis"

// gasPrice isn't reliable on polygon & mumbai, see https://github.com/ethers-io/ethers.js/issues/2828#issuecomment-1283014250
const UNRELIABLE_GASPRICE_NETWORK_IDS = [137, 80001]

const useNonce = (
  address: `0x${string}` | undefined,
  evmNetworkId: EvmNetworkId | undefined,
  forcedValue?: number
) => {
  const { data, ...rest } = useQuery({
    queryKey: ["useNonce", address, evmNetworkId, forcedValue],
    queryFn: () => {
      if (forcedValue !== undefined) return forcedValue
      return address && evmNetworkId ? api.ethGetTransactionsCount(address, evmNetworkId) : null
    },
  })

  return { nonce: forcedValue ?? data ?? undefined, ...rest }
}

// TODO : could be skipped for networks that we know already support it, but need to keep checking for legacy network in case they upgrade
const useHasEip1559Support = (publicClient: PublicClient | undefined) => {
  const evmNetwork = useEvmNetwork(publicClient?.chain?.id?.toString())

  const { data, ...rest } = useQuery({
    queryKey: ["useHasEip1559Support", publicClient?.chain?.id, evmNetwork?.id],
    queryFn: async () => {
      if (!publicClient) return null
      if (evmNetwork?.feeType) return evmNetwork.feeType === "eip-1559"

      try {
        const {
          baseFeePerGas: [baseFee],
        } = await publicClient.getFeeHistory({ blockCount: 1, rewardPercentiles: [] })
        return baseFee > 0n
      } catch (err) {
        // TODO check that feeHistory returns -32601 when method doesn't exist
        const error = err as Error & { code?: number }
        if (error.code === ETH_ERROR_EIP1474_METHOD_NOT_FOUND) return false

        // edge case identified on Scroll network: viem's getFeeHistory method crashes as the rpc response doesn't match expected data type
        // error message: "Cannot convert null to a BigInt"
        if (error.name === "TypeError") return false

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
      "useBlockFeeData",
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
        { gasLimit: blockGasLimit, baseFeePerGas, gasUsed },
        feeHistoryAnalysis,
        estimatedGas,
      ] = await Promise.all([
        publicClient.getGasPrice(),
        publicClient.getBlock(),
        withFeeOptions ? getFeeHistoryAnalysis(publicClient) : undefined,
        // estimate gas may change over time for contract calls, so we need to refresh it every time we prepare the tx to prevent an invalid transaction
        publicClient.estimateGas({ account, to, value, data }),
      ])

      if (feeHistoryAnalysis && !UNRELIABLE_GASPRICE_NETWORK_IDS.includes(publicClient.chain.id)) {
        // minimum maxPriorityPerGas value required to be considered valid into next block is equal to `gasPrice - baseFee`
        let minimumMaxPriorityFeePerGas = gasPrice - feeHistoryAnalysis.nextBaseFee
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

      const networkUsage = Number((gasUsed * 100n) / blockGasLimit) / 100

      return {
        estimatedGas,
        gasPrice,
        baseFeePerGas: feeHistoryAnalysis?.nextBaseFee || baseFeePerGas, // feeHistoryAnalysis?.nextBaseFee can be 0 which is impossible (ex: opBNB chain)
        blockGasLimit,
        networkUsage,
        feeHistoryAnalysis,
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

const useDecodeEvmTransaction = (
  publicClient: PublicClient | undefined,
  request: TransactionRequest | undefined
) => {
  const queryClient = useQueryClient()
  const [tx, setTx] = useState(() => request)

  // update tx if request changes after first call (send funds)
  useEffect(() => {
    setTx(request)
  }, [request])

  const { data: decodedTx, ...rest } = useQuery({
    // check tx as boolean as it's not pure
    queryKey: [
      "useDecodeEvmTransaction",
      publicClient?.chain?.id,
      tx && serializeTransactionRequest(tx),
    ],
    queryFn: async () => {
      if (!publicClient || !tx) return null
      return await decodeEvmTransaction(publicClient, tx)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false, // prevents error to be cleared when window gets focus
    enabled: !!publicClient && !!tx,
  })

  const updateCallArg = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (argName: string, argValue: any) => {
      if (!tx) throw new Error("Missing tx")
      if (!publicClient) throw new Error("Missing publicClient")
      if (!publicClient.chain) throw new Error("Missing publicClient.chain")
      if (!decodedTx?.abi) throw new Error("Missing ABI")
      if (!decodedTx.contractCall) throw new Error("Missing contractCall")

      const { abi, contractCall } = decodedTx
      const { functionName } = contractCall

      const abiCall = abi.find((a) => a.name === functionName)
      if (!abiCall) throw new Error(`ABI for function ${functionName} not found`)
      const argIndex = abiCall.inputs.findIndex((input) => input.name === argName)
      if (argIndex === -1) throw new Error(`arg ${argName} not found in decoded transaction`)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const args = [...contractCall.args] as any
      args[argIndex] = argValue

      const newTx = {
        ...tx,
        data: encodeFunctionData({ abi, functionName, args }),
      }

      // prefetch to prevent tx UI from being replaced by shimmer
      await queryClient.prefetchQuery({
        queryKey: [
          "useDecodeEvmTransaction",
          publicClient.chain.id,
          serializeTransactionRequest(newTx),
        ],
        queryFn: () => decodeEvmTransaction(publicClient, newTx),
      })

      setTx(newTx)
    },
    [decodedTx, publicClient, queryClient, tx]
  )

  return { tx, decodedTx, updateCallArg, ...rest }
}

const getEthGasSettingsFromTransaction = (
  tx: TransactionRequest | undefined,
  hasEip1559Support: boolean | undefined,
  estimatedGas: bigint | undefined,
  blockGasLimit: bigint | undefined,
  isContractCall: boolean | undefined = true // default to worse scenario
) => {
  if (!tx || hasEip1559Support === undefined || !isBigInt(blockGasLimit) || !isBigInt(estimatedGas))
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
      type: "legacy",
      gas,
      gasPrice,
    } as EthGasSettingsLegacy
  }

  return undefined
}

const useGasSettings = ({
  evmNetworkId,
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
  evmNetworkId: EvmNetworkId | undefined
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
  const evmNetwork = useEvmNetwork(evmNetworkId)
  const [customSettings, setCustomSettings] = useState<EthGasSettings>()

  const gasSettingsByPriority: GasSettingsByPriority | undefined = useMemo(() => {
    if (
      hasEip1559Support === undefined ||
      !isBigInt(estimatedGas) ||
      !isBigInt(gasPrice) ||
      !isBigInt(blockGasLimit) ||
      !tx
    )
      return undefined

    const gas = isAcalaEvmPlus(evmNetworkId ?? "")
      ? estimatedGas // use the gas estimation provided by the chain, it is encoding specific values
      : getGasLimit(blockGasLimit, estimatedGas, tx, isContractCall)
    const suggestedSettings = getEthGasSettingsFromTransaction(
      tx,
      hasEip1559Support,
      estimatedGas,
      blockGasLimit,
      isContractCall
    )

    if (hasEip1559Support) {
      if (!feeHistoryAnalysis || !isBigInt(baseFeePerGas)) return undefined

      const mapMaxPriority = { ...feeHistoryAnalysis.maxPriorityPerGasOptions }

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

      if (evmNetworkId && evmNetwork?.l2FeeType?.type === "op-stack") {
        // On op stack, transaction requires a priority fee, as low as 1 wei
        if (mapMaxPriority.low === 0n) mapMaxPriority.low = 1n
        if (mapMaxPriority.medium === 0n) mapMaxPriority.medium = 1n
        if (mapMaxPriority.high === 0n) mapMaxPriority.high = 1n
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
              // if network is idle, it makes sense to use baseFee as max base fee
              maxFeePerGas: feeHistoryAnalysis.isBaseFeeIdle
                ? baseFeePerGas + low.maxPriorityFeePerGas
                : low.maxFeePerGas,
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
    evmNetworkId,
    isContractCall,
    isReplacement,
    customSettings,
    feeHistoryAnalysis,
    baseFeePerGas,
    evmNetwork?.l2FeeType?.type,
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
  request: TransactionRequest | undefined,
  evmNetworkId: EvmNetworkId | undefined,
  lockTransaction = false,
  isReplacement = false
) => {
  const publicClient = usePublicClient(evmNetworkId)
  const {
    tx,
    decodedTx,
    updateCallArg,
    isLoading: isDecoding,
  } = useDecodeEvmTransaction(publicClient, request)
  const { hasEip1559Support, error: errorEip1559Support } = useHasEip1559Support(publicClient)
  const { nonce, error: nonceError } = useNonce(
    tx?.from as `0x${string}` | undefined,
    evmNetworkId,
    isReplacement && tx?.nonce ? tx.nonce : undefined
  )
  const {
    gasPrice,
    networkUsage,
    baseFeePerGas,
    blockGasLimit,
    feeHistoryAnalysis,
    estimatedGas,
    error: blockFeeDataError,
  } = useBlockFeeData(publicClient, tx, hasEip1559Support)

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
    evmNetworkId,
    tx,
    priority,
    hasEip1559Support,
    baseFeePerGas,
    estimatedGas,
    gasPrice,
    blockGasLimit,
    feeHistoryAnalysis,
    isReplacement,
    isContractCall: decodedTx?.isContractCall,
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

  const { data: estimatedL1DataFee, error: l1FeeError } = useEthEstimateL1DataFee(
    publicClient,
    transaction
  )

  // TODO replace this wierd object name with something else... gasInfo ?
  const txDetails = useMemo<EthTransactionDetails | undefined>(() => {
    if (
      !evmNetworkId ||
      !isBigInt(gasPrice) ||
      !isBigInt(estimatedGas) ||
      !isBigInt(estimatedL1DataFee) ||
      !transaction ||
      !gasSettings
    )
      return undefined

    // if eip1559 transaction, wait for baseFee to be available
    if (gasSettings?.type === "eip1559" && !isBigInt(baseFeePerGas)) return undefined

    const { estimatedFee, maxFee } = getTotalFeesFromGasSettings(
      gasSettings,
      estimatedGas,
      baseFeePerGas,
      estimatedL1DataFee
    )

    return {
      evmNetworkId,
      estimatedGas,
      gasPrice,
      baseFeePerGas,
      estimatedFee,
      estimatedL1DataFee,
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
    estimatedL1DataFee,
    transaction,
  ])

  // use staleIsValid to prevent disabling approve button each time there is a new block (triggers gas check)
  const { isValid, error: isValidError } = useIsValidEthTransaction(
    publicClient,
    transaction,
    priority,
    isReplacement
  )

  const { t } = useTranslation("request")
  const { error, errorDetails } = useMemo(() => {
    const anyError = (errorEip1559Support ??
      nonceError ??
      blockFeeDataError ??
      l1FeeError ??
      isValidError) as Error

    const userFriendlyError = getHumanReadableErrorMessage(anyError)

    if (anyError)
      return {
        error: userFriendlyError ?? t("Failed to prepare transaction"),
        errorDetails: anyError.message,
      }

    return { error: undefined, errorDetails: undefined }
  }, [errorEip1559Support, nonceError, blockFeeDataError, l1FeeError, isValidError, t])

  const isLoading = useMemo(
    () => tx && isDecoding && !txDetails && !error,
    [tx, isDecoding, txDetails, error]
  )

  return {
    decodedTx,
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
    updateCallArg,
  }
}
