import {
  getGasLimit,
  getTransactionFeeParams,
  prepareTransaction,
  rebuildTransactionRequestNumbers,
} from "@core/domains/ethereum/helpers"
import {
  EthGasSettings,
  EthGasSettingsEip1559,
  EthGasSettingsLegacy,
} from "@core/domains/ethereum/types"
import { EthPriorityOptionName, EthSignAndSendRequest } from "@core/domains/signing/types"
import { FeeHistoryAnalysis, getFeeHistoryAnalysis } from "@core/util/getFeeHistoryAnalysis"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useEthereumProvider } from "@ui/domains/Ethereum/useEthereumProvider"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useSigningRequestById from "@ui/hooks/useSigningRequestById"
import { BigNumber, ethers } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

const useEthSignTransactionRequestProvider = ({ id }: { id: string }) => {
  const signingRequest = useSigningRequestById(id) as EthSignAndSendRequest | undefined
  const network = useEvmNetwork(signingRequest?.ethChainId)
  const provider = useEthereumProvider(signingRequest?.ethChainId)
  const [estimatedGas, setEstimatedGas] = useState<BigNumber>()
  const [estimatedGasError, setEstimatedGasError] = useState<string>()
  const [gasPrice, setGasPrice] = useState<BigNumber | null>()
  const [blockGasLimit, setBlockGasLimit] = useState<BigNumber | null>()
  const [blockInfoError, setBlockInfoError] = useState<string>()
  const [feeHistoryAnalysis, setFeeHistoryAnalysis] = useState<FeeHistoryAnalysis>()

  const transactionRequest = useMemo(
    () => (signingRequest ? rebuildTransactionRequestNumbers(signingRequest.request) : undefined),
    [signingRequest]
  )

  // initialize with undefined, which is used to trigger the check
  const [hasEip1559Support, setHasEip1559Support] = useState<boolean>()

  useEffect(() => {
    const checkEip1559Support = async () => {
      if (!provider) return
      const { baseFeePerGas } = await provider.send("eth_getBlockByNumber", ["latest", false])
      setHasEip1559Support(baseFeePerGas !== undefined)
    }

    if (hasEip1559Support === undefined) checkEip1559Support()
  }, [hasEip1559Support, provider])

  const baseRequest = useAnySigningRequest<EthSignAndSendRequest>({
    currentRequest: signingRequest,
    approveSignFn: api.ethApproveSignAndSend,
    cancelSignFn: api.ethCancelSign,
  })

  // estimate gas cost (units), can be done only once per signingRequest
  useEffect(() => {
    if (!provider || !transactionRequest) return

    const estimateGas = async () => {
      try {
        setEstimatedGas(await provider.estimateGas(transactionRequest))
        setEstimatedGasError(undefined)
      } catch (err) {
        setEstimatedGasError((err as Error).message)
      }
    }

    estimateGas()
  }, [provider, transactionRequest])

  // analyse fees on each block
  useEffect(() => {
    if (!provider || !estimatedGas) return

    const handleBlock = async () => {
      try {
        const [gasPrice, { gasLimit }, feeOptions] = await Promise.all([
          provider.getGasPrice(),
          provider.getBlock("latest"),
          getFeeHistoryAnalysis(provider),
        ])

        setGasPrice(gasPrice)
        setBlockGasLimit(gasLimit)
        setFeeHistoryAnalysis(feeOptions)
        setBlockInfoError(undefined)
      } catch (err) {
        setBlockInfoError((err as Error).message)
      }
    }

    provider.on("block", handleBlock)

    return () => {
      provider.off("block", handleBlock)
    }
  }, [provider, estimatedGas])

  // set the priority as what is recommended by first fee analysis (based on network usage)
  const [priority, setPriority] = useState<EthPriorityOptionName>()
  useEffect(() => {
    if (!priority && feeHistoryAnalysis) setPriority(feeHistoryAnalysis.recommended)
  }, [feeHistoryAnalysis, priority])

  const gasInfo = useMemo(() => {
    if (!gasPrice || !estimatedGas || !feeHistoryAnalysis || !priority || !blockGasLimit)
      return undefined

    const maxPriorityFeePerGas = feeHistoryAnalysis.options[priority]
    const gasUsedRatio = feeHistoryAnalysis.gasUsedRatio
    const baseFeePerGas = feeHistoryAnalysis.baseFeePerGas

    const { gasCost, maxFee, maxFeeAndGasCost, maxFeePerGas } = getTransactionFeeParams(
      gasPrice,
      estimatedGas,
      baseFeePerGas,
      maxPriorityFeePerGas
    )
    const gasLimit = getGasLimit(blockGasLimit, estimatedGas, transactionRequest?.gasLimit)
    const legacyCost = gasPrice.sub(baseFeePerGas).add(maxPriorityFeePerGas).mul(gasLimit)

    return {
      estimatedGas,
      gasPrice,
      priorityOptions: feeHistoryAnalysis.options,
      baseFeePerGas,
      maxPriorityFeePerGas,
      maxFeePerGas,
      maxFee,
      gasCost,
      maxFeeAndGasCost,
      gasUsedRatio,
      gasLimit,
      legacyCost,
    }
  }, [
    gasPrice,
    estimatedGas,
    feeHistoryAnalysis,
    priority,
    blockGasLimit,
    transactionRequest?.gasLimit,
  ])

  const gasSettings: EthGasSettings | undefined = useMemo(() => {
    if (hasEip1559Support === undefined || !gasInfo) return undefined
    return hasEip1559Support
      ? ({
          type: 2,
          maxFeePerGas: gasInfo.maxFeePerGas,
          maxPriorityFeePerGas: gasInfo.maxPriorityFeePerGas,
          gasLimit: gasInfo.gasLimit,
        } as EthGasSettingsEip1559)
      : ({
          type: 0,
          gasPrice: gasInfo.gasPrice,
          gasLimit: gasInfo.gasLimit,
        } as EthGasSettingsLegacy)
  }, [gasInfo, hasEip1559Support])

  const transaction = useMemo(() => {
    if (!provider || !transactionRequest || !gasSettings) return undefined
    return prepareTransaction(transactionRequest, gasSettings)
  }, [gasSettings, provider, transactionRequest])

  const approve = useCallback(() => {
    return baseRequest.approve(transaction)
  }, [baseRequest, transaction])

  const { isAnalysing, hasError } = useMemo(
    () => ({
      isAnalysing: transactionRequest && !estimatedGasError && !blockInfoError && !gasInfo,
      hasError: Boolean(estimatedGasError || blockInfoError),
    }),
    [blockInfoError, estimatedGasError, gasInfo, transactionRequest]
  )

  return {
    ...baseRequest,
    gasInfo,
    estimatedGasError,
    blockInfoError,
    priority,
    setPriority,
    approve,
    isAnalysing,
    hasError,
    network,
    transaction,
  }
}

export const [EthSignTransactionRequestProvider, useEthSignTransactionRequest] = provideContext(
  useEthSignTransactionRequestProvider
)
