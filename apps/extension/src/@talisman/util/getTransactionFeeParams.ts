import { BigNumber } from "ethers"

export const getTransactionFeeParams = (
  gasPrice: BigNumber,
  estimatedGas: BigNumber,
  baseFeePerGas: BigNumber,
  maxPriorityFeePerGas: BigNumber
) => {
  // if network is busy, gas can augment 12.5% per block.
  // multiplying it by 2 allows fee to be sufficient even if tx has to wait for 8 blocks
  const maxFeePerGas = baseFeePerGas.mul(2).add(maxPriorityFeePerGas)
  const gasCost = estimatedGas.mul(gasPrice)
  const maxFee = estimatedGas.mul(maxFeePerGas)
  const maxFeeAndGasCost = gasCost.add(maxFee)

  return { maxFeePerGas, gasCost, maxFee, maxFeeAndGasCost }
}
