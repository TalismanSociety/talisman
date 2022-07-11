import { AccountAddressType, RequestAccountCreateHardware } from "@core/domains/accounts/types"
import type { AccountJson } from "@core/domains/accounts/types"
import {
  AnalyticsCaptureRequest,
  LoggedinType,
  ModalOpenParams,
  ModalTypes,
  OnboardedType,
} from "@core/domains/app/types"
import { BalancesUpdate, RequestBalance } from "@core/domains/balances/types"
import { BalanceStorage } from "@core/domains/balances/types"
import { ChainId } from "@core/domains/chains/types"
import { AnySigningRequest, TransactionDetails } from "@core/domains/signing/types"
import {
  AuthRequestAddresses,
  AuthRequestId,
  AuthorizeRequest,
  AuthorizedSite,
  AuthorizedSites,
  ProviderType,
} from "@core/domains/sitesAuthorised/types"
import { CustomErc20Token, CustomErc20TokenCreate, TokenId } from "@core/domains/tokens/types"
import { EthResponseType } from "@core/injectEth/types"
import {
  AddEthereumChainRequest,
  AnyEthRequestChainId,
  CustomEvmNetwork,
  MetadataRequest,
  MnemonicSubscriptionResult,
  ResponseAssetTransfer,
  ResponseAssetTransferFeeQuery,
  UnsubscribeFn,
  WatchAssetRequest,
} from "@core/types"
import { AddressesByChain } from "@core/types/base"
import type { KeyringPair$Json } from "@polkadot/keyring/types"
import type { HexString } from "@polkadot/util/types"

export default interface MessageTypes {
  unsubscribe: (id: string) => Promise<null>
  // UNSORTED
  onboard: (
    name: string,
    pass: string,
    passConfirm: string,
    mnemonic?: string
  ) => Promise<OnboardedType>
  authenticate: (pass: string) => Promise<boolean>
  lock: () => Promise<boolean>
  authStatus: () => Promise<LoggedinType>
  authStatusSubscribe: (cb: (val: LoggedinType) => void) => UnsubscribeFn
  onboardStatus: () => Promise<OnboardedType>
  onboardStatusSubscribe: (cb: (val: OnboardedType) => void) => UnsubscribeFn
  dashboardOpen: (route: string) => Promise<boolean>
  onboardOpen: () => Promise<boolean>
  popupOpen: () => Promise<boolean>
  promptLogin: (closeOnSuccess?: boolean) => Promise<boolean>
  approveMetaRequest: (id: string) => Promise<boolean>
  rejectMetaRequest: (id: string) => Promise<boolean>
  subscribeMetadataRequests: (cb: (requests: MetadataRequest[]) => void) => UnsubscribeFn

  // signing messages -------------------------------------------------------
  decodeSignRequest: (id: string) => Promise<TransactionDetails | null>
  cancelSignRequest: (id: string) => Promise<boolean>
  subscribeSigningRequest: (id: string, cb: (requests: AnySigningRequest) => void) => UnsubscribeFn
  subscribeSigningRequests: (cb: (requests: AnySigningRequest[]) => void) => UnsubscribeFn
  approveSign: (id: string) => Promise<boolean>
  approveSignHardware: (id: string, signature: HexString) => Promise<boolean>

  // app message types -------------------------------------------------------
  modalOpen: (modalType: ModalTypes) => Promise<boolean>
  modalOpenSubscribe: (cb: (val: ModalOpenParams) => void) => UnsubscribeFn
  analyticsCapture: (request: AnalyticsCaptureRequest) => Promise<boolean>

  // mnemonic message types -------------------------------------------------------
  mnemonicUnlock: (pass: string) => Promise<string>
  mnemonicConfirm: (confirmed: boolean) => Promise<boolean>
  mnemonicSubscribe: (cb: (val: MnemonicSubscriptionResult) => void) => UnsubscribeFn
  addressFromMnemonic: (mnemonic: string, type?: AccountAddressType) => Promise<string>

  // account message types ---------------------------------------------------
  accountCreate: (name: string, type: AccountAddressType) => Promise<boolean>
  accountCreateFromSeed: (name: string, seed: string, type?: AccountAddressType) => Promise<boolean>
  accountCreateFromJson: (json: string, password: string) => Promise<boolean>
  accountCreateHardware: (
    request: Omit<RequestAccountCreateHardware, "hardwareType">
  ) => Promise<boolean>
  accountsSubscribe: (cb: (accounts: AccountJson[]) => void) => UnsubscribeFn
  accountForget: (address: string) => Promise<boolean>
  accountExport: (address: string) => Promise<{ exportedJson: KeyringPair$Json }>
  accountRename: (address: string, name: string) => Promise<boolean>
  accountValidateMnemonic: (mnemonic: string) => Promise<boolean>

  // balance message types ---------------------------------------------------
  getBalance: ({
    chainId,
    evmNetworkId,
    tokenId,
    address,
  }: RequestBalance) => Promise<BalanceStorage>
  balances: (cb: () => void) => UnsubscribeFn
  balancesByParams: (
    addressesByChain: AddressesByChain,
    cb: (balances: BalancesUpdate) => void
  ) => UnsubscribeFn

  // authorized sites message types ------------------------------------------
  authorizedSites: () => Promise<AuthorizedSites>
  authorizedSitesSubscribe: (cb: (sites: AuthorizedSites) => void) => UnsubscribeFn
  authorizedSite: (id: string) => Promise<AuthorizedSite>
  authorizedSiteSubscribe: (id: string, cb: (sites: AuthorizedSite) => void) => UnsubscribeFn
  authorizedSiteForget: (id: string, type: ProviderType) => Promise<boolean>
  authorizedSiteUpdate: (
    id: string,
    properties: Omit<Partial<AuthorizedSite>, "id">
  ) => Promise<boolean>

  // authorization requests message types ------------------------------------
  authRequestsSubscribe: (cb: (requests: AuthorizeRequest[]) => void) => UnsubscribeFn
  authrequestApprove: (
    id: AuthRequestId,
    addresses: AuthRequestAddresses,
    chainId?: number
  ) => Promise<boolean>
  authrequestReject: (id: AuthRequestId) => Promise<boolean>
  authrequestIgnore: (id: AuthRequestId) => Promise<boolean>

  // chain message types
  chains: (cb: () => void) => UnsubscribeFn

  // token message types
  tokens: (cb: () => void) => UnsubscribeFn

  // custom erc20 token management
  customErc20Tokens: () => Promise<Record<CustomErc20Token["id"], CustomErc20Token>>
  customErc20Token: (id: string) => Promise<CustomErc20Token>
  addCustomErc20Token: (token: CustomErc20TokenCreate) => Promise<boolean>
  removeCustomErc20Token: (id: string) => Promise<boolean>
  clearCustomErc20Tokens: (
    filter: { chainId?: ChainId; evmNetworkId?: number } | undefined
  ) => Promise<boolean>

  // ethereum networks message types
  ethereumNetworks: (cb: () => void) => UnsubscribeFn
  addCustomEthereumNetwork: (ethereumNetwork: CustomEvmNetwork) => Promise<boolean>
  removeCustomEthereumNetwork: (id: string) => Promise<boolean>
  clearCustomEthereumNetworks: () => Promise<boolean>

  // transaction message types
  transactionSubscribe: (id: string, cb: (tx: any) => void) => UnsubscribeFn
  transactionsSubscribe: (cb: (txs: any) => void) => UnsubscribeFn

  // asset transfer messages
  assetTransfer: (
    chainId: ChainId,
    tokenId: TokenId,
    fromAddress: string,
    toAddress: string,
    amount: string,
    tip: string,
    reapBalance?: boolean
  ) => Promise<ResponseAssetTransfer>
  assetTransferCheckFees: (
    chainId: ChainId,
    tokenId: TokenId,
    fromAddress: string,
    toAddress: string,
    amount: string,
    tip: string,
    reapBalance?: boolean
  ) => Promise<ResponseAssetTransferFeeQuery>
  assetTransferApproveSign: (
    pendingTransferId: string,
    signature: `0x${string}` | Uint8Array
  ) => Promise<ResponseAssetTransfer>

  // eth related messages
  ethApproveSign: (id: string) => Promise<boolean>
  ethApproveSignAndSend: (
    id: string,
    maxFeePerGas: string,
    maxPriorityFeePerGas: string
  ) => Promise<boolean>
  ethCancelSign: (id: string) => Promise<boolean>
  ethRequest: <T extends AnyEthRequestChainId>(request: T) => Promise<EthResponseType<T["method"]>>
  ethNetworkAddGetRequests: () => Promise<AddEthereumChainRequest[]>
  ethNetworkAddApprove: (id: string) => Promise<boolean>
  ethNetworkAddCancel: (is: string) => Promise<boolean>
  ethNetworkAddSubscribeRequests: (
    cb: (requests: AddEthereumChainRequest[]) => void
  ) => UnsubscribeFn

  ethWatchAssetRequestApprove: (id: string) => Promise<boolean>
  ethWatchAssetRequestCancel: (is: string) => Promise<boolean>
  ethWatchAssetRequestSubscribe: (
    id: string,
    cb: (requests: WatchAssetRequest) => void
  ) => UnsubscribeFn
  ethWatchAssetRequestsSubscribe: (cb: (requests: WatchAssetRequest[]) => void) => UnsubscribeFn
}
