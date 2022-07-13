import { ChainId } from "@core/domains/chains/types"
import { EvmNetworkId } from "@core/domains/ethereum/types"
import { TokenId } from "@core/domains/tokens/types"
import { Address } from "@core/types/base"

export type BalancesStorage = Record<string, BalanceStorage>

export type BalanceStorage = BalanceStorageBalances | BalanceStorageOrmlTokens | BalanceStorageErc20

export type BalanceStatus = "live" | "cache"

export type BalanceStorageBalances = {
  // TODO: Rename `pallet` to `source`? Also, rename `balances` to `native`.
  // Since we now have evm networks, some balances with the `balances` pallet are actually
  // native balances on evm. So there's no pallet involved.
  // Also, erc20 balances might be from an evm network, in which case there's also no pallet involved.
  pallet: "balances"

  status: BalanceStatus

  address: Address
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
  tokenId: TokenId

  free: string
  reserved: string
  miscFrozen: string
  feeFrozen: string
}

export type BalanceStorageOrmlTokens = {
  pallet: "orml-tokens"

  status: BalanceStatus

  address: Address
  chainId: ChainId
  evmNetworkId?: EvmNetworkId
  tokenId: TokenId

  free: string
  reserved: string
  frozen: string
}

export type BalanceStorageErc20 = {
  pallet: "erc20"

  status: BalanceStatus

  address: Address
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
  tokenId: TokenId

  free: string
}
