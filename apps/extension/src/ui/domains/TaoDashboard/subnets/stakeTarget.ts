import { isAddressEqual } from "@talismn/crypto"

export type StakeTarget = { address: string | undefined }

export const getStakeTarget = (
  stakingAddresses: string[],
  fundedAddresses: string[],
  isBalanceInitializing: boolean
): StakeTarget | null => {
  const fundedAddress = stakingAddresses.find((address) =>
    fundedAddresses.some((funded) => isAddressEqual(funded, address))
  )
  if (fundedAddress) return { address: fundedAddress }

  if (!isBalanceInitializing || !stakingAddresses.length) return null

  return { address: stakingAddresses.length === 1 ? stakingAddresses[0] : undefined }
}
