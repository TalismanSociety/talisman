import { CustomErc20Token } from "@core/domains/tokens/types"
import { AnyEthRequest, EthProviderMessage, EthResponseTypes } from "@core/injectEth/types"
import { RequestIdOnly } from "@core/types/base"
import { CustomEvmNetwork, EvmNetworkId } from "@talismn/chaindata-provider"
import { BigNumberish, ethers } from "ethers"

export type {
  EvmNetwork,
  CustomEvmNetwork,
  EvmNetworkId,
  EvmNetworkList,
  EthereumRpc,
} from "@talismn/chaindata-provider"

export type AddEthereumChainParameter = {
  /** A 0x-prefixed hexadecimal string */
  chainId: string
  chainName: string
  nativeCurrency: {
    name: string
    /** 2-6 characters long */
    symbol: string
    decimals: 18
  }
  rpcUrls: string[]
  blockExplorerUrls?: string[]
  /** Currently ignored by metamask */
  iconUrls?: string[]
}

export type WatchAssetBase = {
  type: "ERC20"
  options: {
    address: string // The hexadecimal Ethereum address of the token contract
    symbol?: string // A ticker symbol or shorthand, up to 11 alphanumerical characters
    decimals?: number // The number of asset decimals
    image?: string // A string url of the token logo
  }
}

export declare type EthApproveSignAndSend = RequestIdOnly & {
  transaction: ethers.providers.TransactionRequest
}
export type EthRequestSigningApproveSignature = {
  id: string
  signedPayload: `0x${string}`
}

export interface AnyEthRequestChainId extends AnyEthRequest {
  chainId: EvmNetworkId
}

export type EthNonceRequest = {
  address: string
  evmNetworkId: EvmNetworkId
}

export type WatchAssetRequest = {
  request: WatchAssetBase
  token: CustomErc20Token
  id: string
  url: string
}

// ethereum networks

export type AddEthereumChainRequest = {
  id: string
  idStr: string
  url: string
  network: AddEthereumChainParameter
}

export type Web3WalletPermissionTarget = "eth_accounts" // add more options as needed using |

// from https://docs.metamask.io/guide/rpc-api.html#restricted-methods
export interface Web3WalletPermission {
  // The name of the method corresponding to the permission
  parentCapability: Web3WalletPermissionTarget

  // The date the permission was granted, in UNIX epoch time
  date?: number

  // more to come...
}

// from https://docs.metamask.io/guide/rpc-api.html#wallet-requestpermissions
export type RequestedPermissions = Record<Web3WalletPermissionTarget, unknown>

export interface EthMessages {
  // all ethereum calls
  "pub(eth.request)": [AnyEthRequest, EthResponseTypes]
  "pub(eth.subscribe)": [null, boolean, EthProviderMessage]
  "pub(eth.mimicMetaMask)": [null, boolean]
  // eth signing message signatures
  "pri(eth.request)": [AnyEthRequestChainId, EthResponseTypes]
  "pri(eth.transactions.count)": [EthNonceRequest, number]
  "pri(eth.signing.cancel)": [RequestIdOnly, boolean]
  "pri(eth.signing.approveSign)": [RequestIdOnly, boolean]
  "pri(eth.signing.approveSignHardware)": [EthRequestSigningApproveSignature, boolean]
  "pri(eth.signing.approveSignAndSend)": [EthApproveSignAndSend, boolean]
  "pri(eth.signing.approveSignAndSendHardware)": [EthRequestSigningApproveSignature, boolean]
  // eth add networks requests management
  // TODO change naming for network add requests, and maybe delete the first one
  "pri(eth.networks.add.requests)": [null, AddEthereumChainRequest[]]
  "pri(eth.networks.add.approve)": [RequestIdOnly, boolean]
  "pri(eth.networks.add.cancel)": [RequestIdOnly, boolean]
  "pri(eth.networks.add.subscribe)": [null, boolean, AddEthereumChainRequest[]]
  // eth watchassets requests  management
  "pri(eth.watchasset.requests.approve)": [RequestIdOnly, boolean]
  "pri(eth.watchasset.requests.cancel)": [RequestIdOnly, boolean]
  "pri(eth.watchasset.requests.subscribe)": [null, boolean, WatchAssetRequest[]]
  "pri(eth.watchasset.requests.subscribe.byid)": [RequestIdOnly, boolean, WatchAssetRequest]

  // ethereum networks message signatures
  "pri(eth.networks.subscribe)": [null, boolean, boolean]
  "pri(eth.networks.add.custom)": [CustomEvmNetwork, boolean]
  "pri(eth.networks.removeCustomNetwork)": [RequestIdOnly, boolean]
  "pri(eth.networks.clearCustomNetworks)": [null, boolean]
}

export type EthGasSettingsLegacy = {
  type: 0
  gasLimit: BigNumberish
  gasPrice: BigNumberish
}
export type EthGasSettingsEip1559 = {
  type: 2
  gasLimit: BigNumberish
  maxFeePerGas: BigNumberish
  maxPriorityFeePerGas: BigNumberish
}
export type EthGasSettings = EthGasSettingsLegacy | EthGasSettingsEip1559

export type LedgerEthDerivationPathType = "LedgerLive" | "Legacy" | "BIP44"
