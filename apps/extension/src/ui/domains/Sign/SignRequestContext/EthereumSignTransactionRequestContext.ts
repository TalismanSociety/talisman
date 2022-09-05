import { EthPriorityOptionName, EthSignAndSendRequest } from "@core/domains/signing/types"
import { FeeHistoryAnalysis, getFeeHistoryAnalysis } from "@core/util/getFeeHistoryAnalysis"
import { getTransactionFeeParams } from "@talisman/util/getTransactionFeeParams"
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
  const [blockInfoError, setBlockInfoError] = useState<string>()
  const [feeHistoryAnalysis, setFeeHistoryAnalysis] = useState<FeeHistoryAnalysis>()

  const approveSignFn = useMemo(() => {
    return signingRequest?.method === "eth_sendTransaction"
      ? api.ethApproveSignAndSend
      : api.ethApproveSign
  }, [signingRequest?.method])

  const baseRequest = useAnySigningRequest<EthSignAndSendRequest>({
    currentRequest: signingRequest,
    approveSignFn,
    cancelSignFn: api.ethCancelSign,
  })

  // estimate gas cost (units), can be done only once per signingRequest
  useEffect(() => {
    if (!provider || signingRequest?.method !== "eth_sendTransaction") return

    const estimateGas = async () => {
      try {
        setEstimatedGas(await provider.estimateGas(signingRequest.request))
        setEstimatedGasError(undefined)
      } catch (err) {
        setEstimatedGasError((err as Error).message)
      }
    }

    estimateGas()
  }, [provider, signingRequest])

  // analyse fees on each block
  useEffect(() => {
    if (!provider || !estimatedGas) return

    const handleBlock = async () => {
      try {
        const [feeData, feeOptions] = await Promise.all([
          provider.getFeeData(), // only for gas price
          getFeeHistoryAnalysis(provider),
        ])

        setGasPrice(feeData.gasPrice)
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
    if (!gasPrice || !estimatedGas || !feeHistoryAnalysis || !priority) return undefined

    const maxPriorityFeePerGas = feeHistoryAnalysis.options[priority]
    const gasUsedRatio = feeHistoryAnalysis.gasUsedRatio
    const baseFeePerGas = feeHistoryAnalysis.baseFeePerGas

    const { gasCost, maxFee, maxFeeAndGasCost, maxFeePerGas } = getTransactionFeeParams(
      gasPrice,
      estimatedGas,
      baseFeePerGas,
      maxPriorityFeePerGas
    )

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
    }
  }, [estimatedGas, gasPrice, feeHistoryAnalysis, priority])

  const approve = useCallback(() => {
    // arguments of approveSignFn are: requestId, maxFeePerGas, maxPriorityFeePerGas
    // the requestId is already set by the common handler, here we must just add the following ones
    // serialize values as wei, making it easy to parse & debug on backend
    const args = gasInfo
      ? [
          ethers.utils.formatUnits(gasInfo.maxFeePerGas, 0),
          ethers.utils.formatUnits(gasInfo.maxPriorityFeePerGas, 0),
        ]
      : []
    return baseRequest.approve(...args)
  }, [baseRequest, gasInfo])

  const { isAnalysing, hasError } = useMemo(
    () => ({
      isAnalysing:
        signingRequest?.method === "eth_sendTransaction" &&
        !estimatedGasError &&
        !blockInfoError &&
        !gasInfo,
      hasError: Boolean(estimatedGasError || blockInfoError),
    }),
    [blockInfoError, estimatedGasError, gasInfo, signingRequest?.method]
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
  }
}

export const [EthSignTransactionRequestProvider, useEthSignTransactionRequest] = provideContext(
  useEthSignTransactionRequestProvider
)
