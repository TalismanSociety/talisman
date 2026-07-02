import { address as solAddress } from "@solana/kit"
import { fetchMint } from "@solana-program/token-2022"
import { calculateToken2022TransferFee, getTransferFeeConfig } from "@talismn/balances"
import type { SolRpc } from "@talismn/chain-connectors"
import { isTokenOfType, type Token } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { useSolanaRpc } from "@ui/util/solana/useSolanaRpc"

type TransferFeeInfo = {
  feeBasisPoints: number
  maxFee: bigint
  /** The fee amount for the given transfer value */
  feeAmount: bigint
  /** The amount the recipient will receive after fees */
  recipientAmount: bigint
}

/**
 * Hook to calculate transfer fee for Token 2022 tokens.
 * Returns null if the token has no transfer fee extension.
 */
export const useToken2022TransferFee = (
  token: Token | null | undefined,
  value: string | null | undefined
) => {
  const rpc = useSolanaRpc(token?.networkId)

  return useQuery({
    queryKey: ["token2022TransferFee", token?.id, value, token?.networkId],
    queryFn: async (): Promise<TransferFeeInfo | null> => {
      if (!token || !isTokenOfType(token, "sol-token2022") || !rpc || !value) return null

      return getToken2022TransferFee(rpc, token.mintAddress, BigInt(value))
    },
    enabled: !!token && isTokenOfType(token, "sol-token2022") && !!rpc && !!value,
  })
}

const getToken2022TransferFee = async (
  rpc: SolRpc,
  mintAddress: string,
  amount: bigint
): Promise<TransferFeeInfo | null> => {
  const mintAccount = await fetchMint(rpc, solAddress(mintAddress))

  const transferFeeConfig = getTransferFeeConfig(mintAccount.data)
  if (!transferFeeConfig) return null

  const { epoch } = await rpc.getEpochInfo().send()
  const currentTransferFee =
    epoch >= transferFeeConfig.newerTransferFee.epoch
      ? transferFeeConfig.newerTransferFee
      : transferFeeConfig.olderTransferFee

  const feeBasisPoints = currentTransferFee.transferFeeBasisPoints
  const maxFee = currentTransferFee.maximumFee
  const feeAmount = calculateToken2022TransferFee(transferFeeConfig, epoch, amount)

  return {
    feeBasisPoints,
    maxFee,
    feeAmount,
    recipientAmount: amount - feeAmount,
  }
}
