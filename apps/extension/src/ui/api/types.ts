import { AccountAddressType, RequestAccountCreateHardware } from "@core/domains/accounts/types"
import type { AccountJson } from "@core/domains/accounts/types"
import { MnemonicSubscriptionResult } from "@core/domains/accounts/types"
import {
  AnalyticsCaptureRequest,
  LoggedinType,
  ModalOpenRequest,
  OnboardedType,
} from "@core/domains/app/types"
import {
  AddressesByEvmNetwork,
  BalanceJson,
  BalancesUpdate,
  RequestBalance,
  RequestBalanceLocks,
  ResponseBalanceLocks,
} from "@core/domains/balances/types"
import { ChainId } from "@core/domains/chains/types"
import { AnyEncryptRequest } from "@core/domains/encrypt/types"
import {
  AddEthereumChainRequest,
  AnyEthRequestChainId,
  EthGasSettings,
  EvmNetworkId,
  RequestUpsertCustomEvmNetwork,
  WatchAssetRequest,
} from "@core/domains/ethereum/types"
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
import {
  ResponseAssetTransfer,
  ResponseAssetTransferEth,
  ResponseAssetTransferFeeQuery,
} from "@core/domains/transactions/types"
import { EthResponseType } from "@core/injectEth/types"
import { UnsubscribeFn } from "@core/types"
import { AddressesByChain } from "@core/types/base"
import { MetadataRequest } from "@polkadot/extension-base/background/types"
import type { KeyringPair$Json } from "@polkadot/keyring/types"
import type { HexString } from "@polkadot/util/types"
import { ethers } from "ethers"

export default interface MessageTypes {
  unsubscribe: (id: string) => Promise<null>
  // UNSORTED
  onboard: (pass: string, passConfirm: string, mnemonic?: string) => Promise<OnboardedType>
  authenticate: (pass: string) => Promise<boolean>
  lock: () => Promise<boolean>
  changePassword: (currentPw: string, newPw: string, newPwConfirm: string) => Promise<boolean>
  checkPassword: (password: string) => Promise<boolean>
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
  allowPhishingSite: (url: string) => Promise<boolean>

  // signing messages -------------------------------------------------------
  decodeSignRequest: (id: string) => Promise<TransactionDetails>
  cancelSignRequest: (id: string) => Promise<boolean>
  subscribeSigningRequest: (id: string, cb: (requests: AnySigningRequest) => void) => UnsubscribeFn
  subscribeSigningRequests: (cb: (requests: AnySigningRequest[]) => void) => UnsubscribeFn
  approveSign: (id: string) => Promise<boolean>
  approveSignHardware: (id: string, signature: HexString) => Promise<boolean>

  // encrypt messages -------------------------------------------------------
  subscribeEncryptRequests: (cb: (requests: AnyEncryptRequest[]) => void) => UnsubscribeFn
  subscribeEncryptRequest: (id: string, cb: (requests: AnyEncryptRequest) => void) => UnsubscribeFn
  approveEncrypt: (id: string) => Promise<boolean>
  approveDecrypt: (id: string) => Promise<boolean>
  cancelEncryptRequest: (id: string) => Promise<boolean>

  // app message types -------------------------------------------------------
  modalOpen: (modal: ModalOpenRequest) => Promise<boolean>
  modalOpenSubscribe: (cb: (val: ModalOpenRequest) => void) => UnsubscribeFn
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
  accountCreateHardwareEthereum: (name: string, address: string, path: string) => Promise<boolean>
  accountsSubscribe: (cb: (accounts: AccountJson[]) => void) => UnsubscribeFn
  accountForget: (address: string) => Promise<boolean>
  accountExport: (
    address: string,
    password: string,
    exportPw: string
  ) => Promise<{ exportedJson: KeyringPair$Json }>
  accountRename: (address: string, name: string) => Promise<boolean>
  accountValidateMnemonic: (mnemonic: string) => Promise<boolean>

  // balance message types ---------------------------------------------------
  getBalance: ({ chainId, evmNetworkId, tokenId, address }: RequestBalance) => Promise<BalanceJson>
  getBalanceLocks: ({ chainId, addresses }: RequestBalanceLocks) => Promise<ResponseBalanceLocks>
  balances: (cb: () => void) => UnsubscribeFn
  balancesByParams: (
    addressesByChain: AddressesByChain,
    addressesByEvmNetwork: AddressesByEvmNetwork,
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
  authrequestApprove: (id: AuthRequestId, addresses: AuthRequestAddresses) => Promise<boolean>
  authrequestReject: (id: AuthRequestId) => Promise<boolean>
  authrequestIgnore: (id: AuthRequestId) => Promise<boolean>

  // chain message types
  chains: (cb: () => void) => UnsubscribeFn

  // token message types
  tokens: (cb: () => void) => UnsubscribeFn

  // tokenRates message types
  tokenRates: (cb: () => void) => UnsubscribeFn

  // custom erc20 token management
  customErc20Tokens: () => Promise<Record<CustomErc20Token["id"], CustomErc20Token>>
  customErc20Token: (id: string) => Promise<CustomErc20Token>
  addCustomErc20Token: (token: CustomErc20TokenCreate) => Promise<boolean>
  removeCustomErc20Token: (id: string) => Promise<boolean>

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
  assetTransferEth: (
    evmNetworkId: EvmNetworkId,
    tokenId: TokenId,
    fromAddress: string,
    toAddress: string,
    amount: string,
    gasSettings: EthGasSettings
  ) => Promise<ResponseAssetTransferEth>
  assetTransferEthHardware: (
    evmNetworkId: EvmNetworkId,
    tokenId: TokenId,
    amount: string,
    signedTransaction: HexString
  ) => Promise<ResponseAssetTransferEth>
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
  ethApproveSignHardware: (id: string, signature: HexString) => Promise<boolean>
  ethApproveSignAndSend: (
    id: string,
    transaction: ethers.providers.TransactionRequest
  ) => Promise<boolean>
  ethApproveSignAndSendHardware: (id: string, signedTransaction: HexString) => Promise<boolean>
  ethCancelSign: (id: string) => Promise<boolean>
  ethRequest: <T extends AnyEthRequestChainId>(request: T) => Promise<EthResponseType<T["method"]>>
  ethGetTransactionsCount: (address: string, evmNetworkId: EvmNetworkId) => Promise<number>
  ethNetworkAddGetRequests: () => Promise<AddEthereumChainRequest[]>
  ethNetworkAddApprove: (id: string) => Promise<boolean>
  ethNetworkAddCancel: (is: string) => Promise<boolean>
  ethNetworkAddSubscribeRequests: (
    cb: (requests: AddEthereumChainRequest[]) => void
  ) => UnsubscribeFn

  // ethereum networks message types
  ethereumNetworks: (cb: () => void) => UnsubscribeFn
  ethNetworkUpsert: (network: RequestUpsertCustomEvmNetwork) => Promise<boolean>
  ethNetworkRemove: (id: string) => Promise<boolean>
  ethNetworkReset: (id: string) => Promise<boolean>

  // ethereum tokens message types
  ethWatchAssetRequestApprove: (id: string) => Promise<boolean>
  ethWatchAssetRequestCancel: (is: string) => Promise<boolean>
  ethWatchAssetRequestSubscribe: (
    id: string,
    cb: (requests: WatchAssetRequest) => void
  ) => UnsubscribeFn
  ethWatchAssetRequestsSubscribe: (cb: (requests: WatchAssetRequest[]) => void) => UnsubscribeFn
}
