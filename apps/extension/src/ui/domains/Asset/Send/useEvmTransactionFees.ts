import { EthPriorityOptionName } from "@core/domains/signing/types"
import { FeeHistoryAnalysis, getFeeHistoryAnalysis } from "@core/util/getFeeHistoryAnalysis"
import { getTransactionFeeParams } from "@talisman/util/getTransactionFeeParams"
import { useEthereumProvider } from "@ui/hooks/useEthereumProvider"
import { BigNumber, ethers } from "ethers"
import { useEffect, useMemo, useState } from "react"

export const useEvmTransactionFees = (tx?: ethers.providers.TransactionRequest) => {
  const [estimatedGas, setEstimatedGas] = useState<BigNumber>()
  const [estimatedGasError, setEstimatedGasError] = useState<string>()
  const [isLoadingEstimatedGas, setIsLoadingEstimatedGas] = useState(false)

  const [gasPrice, setGasPrice] = useState<BigNumber | null>()
  const [feeHistoryAnalysis, setFeeHistoryAnalysis] = useState<FeeHistoryAnalysis>()
  const [blockInfoError, setBlockInfoError] = useState<string>()
  const [isLoadingBlockInfo, setIsLoadingBlockInfo] = useState(false)

  const provider = useEthereumProvider(tx?.chainId)

  // estimate gas
  useEffect(() => {
    setIsLoadingEstimatedGas(false)
    setEstimatedGasError(undefined)
    setEstimatedGas(undefined)

    if (!provider || !tx) return

    setIsLoadingEstimatedGas(true)
    provider
      .estimateGas(tx)
      .then(setEstimatedGas)
      .catch((err) => setEstimatedGasError(err.message))
      .finally(() => setIsLoadingEstimatedGas(false))

    return () => {
      setEstimatedGasError(undefined)
      setEstimatedGas(undefined)
      setIsLoadingEstimatedGas(false)
    }
  }, [provider, tx])

  // analyse fees on each block
  useEffect(() => {
    if (!provider || !estimatedGas) return

    const handleBlock = async () => {
      setIsLoadingBlockInfo(true)
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
      setIsLoadingBlockInfo(false)
    }

    provider.on("block", handleBlock)

    return () => {
      provider.off("block", handleBlock)
    }
  }, [provider, estimatedGas])

  const [priority, setPriority] = useState<EthPriorityOptionName>("low")

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

  const evmTransactionFees = {
    gasInfo,
    priority,
    setPriority,
    priorityOptions: feeHistoryAnalysis?.options,
    isLoading: isLoadingEstimatedGas || isLoadingBlockInfo,
    error: estimatedGasError ?? blockInfoError,
  }

  return evmTransactionFees
}
