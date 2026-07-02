import {
  calculateEpochFee,
  getEpochFee,
  getMint,
  getTransferFeeConfig,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token"
import type { Connection } from "@solana/web3.js"
import { PublicKey } from "@solana/web3.js"
import { isTokenOfType, type Token } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { useSolanaConnection } from "@ui/util/solana/useSolanaConnection"

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
  const connection = useSolanaConnection(token?.networkId)

  return useQuery({
    queryKey: ["token2022TransferFee", token?.id, value, token?.networkId],
    queryFn: async (): Promise<TransferFeeInfo | null> => {
      if (!token || !isTokenOfType(token, "sol-token2022") || !connection || !value) return null

      return getToken2022TransferFee(connection, token.mintAddress, BigInt(value))
    },
    enabled: !!token && isTokenOfType(token, "sol-token2022") && !!connection && !!value,
  })
}

const getToken2022TransferFee = async (
  connection: Connection,
  mintAddress: string,
  amount: bigint
): Promise<TransferFeeInfo | null> => {
  const mintPubkey = new PublicKey(mintAddress)
  const mintAccount = await getMint(connection, mintPubkey, undefined, TOKEN_2022_PROGRAM_ID)

  const transferFeeConfig = getTransferFeeConfig(mintAccount)
  if (!transferFeeConfig) return null

  const { epoch } = await connection.getEpochInfo()
  const currentTransferFee = getEpochFee(transferFeeConfig, BigInt(epoch))

  const feeBasisPoints = currentTransferFee.transferFeeBasisPoints
  const maxFee = currentTransferFee.maximumFee
  const feeAmount = calculateEpochFee(transferFeeConfig, BigInt(epoch), amount)

  return {
    feeBasisPoints,
    maxFee,
    feeAmount,
    recipientAmount: amount - feeAmount,
  }
}
