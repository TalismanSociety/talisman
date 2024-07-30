import type { KeyringPair$Json } from "@polkadot/keyring/types"
import type { HexString } from "@polkadot/util/types"
import { KeypairType } from "@polkadot/util-crypto/types"
import { Address, BalanceJson } from "@talismn/balances"
import { ChainId, EvmNetworkId, TokenId } from "@talismn/chaindata-provider"
import { NsLookupType } from "@talismn/on-chain-id"
import { MetadataDef } from "inject/substrate/types"
import { TransactionRequest } from "viem"

import {
  AccountAddressType,
  AccountJson,
  AddEthereumChainRequest,
  AddEthereumChainRequestId,
  AddressesAndEvmNetwork,
  AddressesAndTokens,
  AddressesByChain,
  AnalyticsCaptureRequest,
  AnyEthRequestChainId,
  AssetDiscoveryMode,
  AssetTransferMethod,
  AuthorisedSiteUpdate,
  AuthorizedSite,
  AuthorizedSites,
  AuthRequestAddresses,
  AuthRequestId,
  BalanceSubscriptionResponse,
  ChangePasswordStatusUpdate,
  CustomEvmTokenCreate,
  DecryptRequestId,
  EncryptRequestId,
  EthGasSettings,
  EvmAddress,
  LoggedinType,
  MetadataUpdateStatus,
  ModalOpenRequest,
  NftData,
  ProviderType,
  RequestAccountCreateLedgerSubstrate,
  RequestAccountCreateOptions,
  RequestAddressLookup,
  RequestBalance,
  RequestMetadataId,
  RequestSetVerifierCertParams,
  RequestUpsertCustomChain,
  RequestUpsertCustomEvmNetwork,
  ResponseAssetTransfer,
  ResponseAssetTransferFeeQuery,
  SendFundsOpenRequest,
  SignerPayloadGenesisHash,
  SignerPayloadJSON,
  SigningRequestID,
  UnsubscribeFn,
  ValidRequests,
  WalletTransactionTransferInfo,
  WatchAssetRequestId,
} from "@extension/core"
import {
  RequestAccountsCatalogAction,
  Trees,
} from "@extension/core/domains/accounts/helpers.catalog"

export default interface MessageTypes {
  ping: () => Promise<boolean>
  unsubscribe: (id: string) => Promise<null>
  // UNSORTED
  onboardCreatePassword: (pass: string, passConfirm: string) => Promise<boolean>
  authenticate: (pass: string) => Promise<boolean>
  lock: () => Promise<boolean>
  changePassword: (currentPw: string, newPw: string, newPwConfirm: string) => Promise<boolean>
  changePasswordSubscribe: (
    currentPw: string,
    newPw: string,
    newPwConfirm: string,
    cb: (val: ChangePasswordStatusUpdate) => void
  ) => Promise<boolean>
  checkPassword: (password: string) => Promise<boolean>
  authStatus: () => Promise<LoggedinType>
  authStatusSubscribe: (cb: (val: LoggedinType) => void) => UnsubscribeFn
  dashboardOpen: (route: string) => Promise<boolean>
  onboardOpen: () => Promise<boolean>
  popupOpen: (argument?: string) => Promise<boolean>
  promptLogin: () => Promise<boolean>
  approveMetaRequest: (id: RequestMetadataId) => Promise<boolean>
  rejectMetaRequest: (id: RequestMetadataId) => Promise<boolean>
  allowPhishingSite: (url: string) => Promise<boolean>

  // signing messages -------------------------------------------------------
  cancelSignRequest: (id: SigningRequestID<"substrate-sign">) => Promise<boolean>
  approveSign: (
    id: SigningRequestID<"substrate-sign">,
    payload?: SignerPayloadJSON
  ) => Promise<boolean>
  approveSignHardware: (
    id: SigningRequestID<"substrate-sign">,
    signature: HexString,
    payload?: SignerPayloadJSON
  ) => Promise<boolean>
  approveSignQr: (
    id: SigningRequestID<"substrate-sign">,
    signature: HexString,
    payload?: SignerPayloadJSON
  ) => Promise<boolean>
  approveSignSignet: (id: SigningRequestID<"substrate-sign">) => Promise<boolean>

  // encrypt messages -------------------------------------------------------
  approveEncrypt: (id: EncryptRequestId) => Promise<boolean>
  approveDecrypt: (id: DecryptRequestId) => Promise<boolean>
  cancelEncryptRequest: (id: DecryptRequestId | EncryptRequestId) => Promise<boolean>

  // app message types -------------------------------------------------------
  modalOpen: (modal: ModalOpenRequest) => Promise<boolean>
  modalOpenSubscribe: (cb: (val: ModalOpenRequest) => void) => UnsubscribeFn
  analyticsCapture: (request: AnalyticsCaptureRequest) => Promise<boolean>
  sendFundsOpen: (request?: SendFundsOpenRequest) => Promise<boolean>
  resetWallet: () => Promise<boolean>
  subscribeRequests: (cb: (request: ValidRequests[]) => void) => UnsubscribeFn

  // mnemonic message types -------------------------------------------------------
  mnemonicUnlock: (mnemonicId: string, pass: string) => Promise<string>
  mnemonicConfirm: (mnemonicId: string, confirmed: boolean) => Promise<boolean>
  mnemonicRename: (mnemonicId: string, name: string) => Promise<boolean>
  mnemonicDelete: (mnemonicId: string) => Promise<boolean>
  validateMnemonic: (mnemonic: string) => Promise<boolean>
  setVerifierCertMnemonic: (...params: RequestSetVerifierCertParams) => Promise<boolean>

  // account message types ---------------------------------------------------
  accountCreate: (
    name: string,
    type: AccountAddressType,
    options: RequestAccountCreateOptions
  ) => Promise<string>
  accountCreateFromSuri: (name: string, suri: string, type?: AccountAddressType) => Promise<string>
  accountCreateFromJson: (unlockedPairs: KeyringPair$Json[]) => Promise<string[]>
  accountCreateLedgerSubstrate: (request: RequestAccountCreateLedgerSubstrate) => Promise<string>
  accountCreateLedgerEthereum: (name: string, address: string, path: string) => Promise<string>
  accountCreateDcent: (
    name: string,
    address: string,
    type: KeypairType,
    path: string,
    tokenIds: TokenId[]
  ) => Promise<string>
  accountCreateQr: (name: string, address: string, genesisHash: HexString | null) => Promise<string>
  accountCreateWatched: (name: string, address: string, isPortfolio: boolean) => Promise<string>
  accountCreateSignet: (
    name: string,
    address: string,
    genesisHash: `0x${string}`,
    signetUrl: string
  ) => Promise<string>
  accountExternalSetIsPortfolio: (address: string, isPortfolio: boolean) => Promise<boolean>
  accountsSubscribe: (cb: (accounts: AccountJson[]) => void) => UnsubscribeFn
  accountsCatalogSubscribe: (cb: (trees: Trees) => void) => UnsubscribeFn
  accountsCatalogRunActions: (actions: RequestAccountsCatalogAction[]) => Promise<boolean>
  accountsOnChainIdsResolveNames: (
    names: string[]
  ) => Promise<Record<string, [string, NsLookupType] | null>>
  accountsOnChainIdsLookupAddresses: (addresses: string[]) => Promise<Record<string, string | null>>
  accountForget: (address: string) => Promise<boolean>
  accountExport: (
    address: string,
    password: string,
    exportPw: string
  ) => Promise<{ exportedJson: KeyringPair$Json }>
  accountExportPrivateKey: (address: string, password: string) => Promise<string>
  accountRename: (address: string, name: string) => Promise<boolean>
  validateDerivationPath: (derivationPath: string, type: AccountAddressType) => Promise<boolean>
  addressLookup: (lookup: RequestAddressLookup) => Promise<string>
  getNextDerivationPath: (mnemonicId: string, type: AccountAddressType) => Promise<string>

  // balance message types ---------------------------------------------------
  getBalance: ({
    chainId,
    evmNetworkId,
    tokenId,
    address,
  }: RequestBalance) => Promise<BalanceJson | undefined>
  balances: (cb: (balances: BalanceSubscriptionResponse) => void) => UnsubscribeFn
  balancesByParams: (
    addressesByChain: AddressesByChain,
    addressesAndEvmNetworks: AddressesAndEvmNetwork,
    addressesAndTokens: AddressesAndTokens,
    cb: (balances: BalanceSubscriptionResponse) => void
  ) => UnsubscribeFn

  // authorized sites message types ------------------------------------------
  authorizedSites: () => Promise<AuthorizedSites>
  authorizedSitesSubscribe: (cb: (sites: AuthorizedSites) => void) => UnsubscribeFn
  authorizedSite: (id: string) => Promise<AuthorizedSite>
  authorizedSiteSubscribe: (id: string, cb: (sites: AuthorizedSite) => void) => UnsubscribeFn
  authorizedSiteForget: (id: string, type: ProviderType) => Promise<boolean>
  authorizedSiteUpdate: (id: string, authorisedSite: AuthorisedSiteUpdate) => Promise<boolean>
  authorizedSitesDisconnectAll: (type: ProviderType) => Promise<boolean>
  authorizedSitesForgetAll: (type: ProviderType) => Promise<boolean>

  // authorization requests message types ------------------------------------
  authrequestApprove: (id: AuthRequestId, addresses: AuthRequestAddresses) => Promise<boolean>
  authrequestReject: (id: AuthRequestId) => Promise<boolean>
  authrequestIgnore: (id: AuthRequestId) => Promise<boolean>

  metadataUpdatesSubscribe: (
    genesisHash: HexString,
    cb: (status: MetadataUpdateStatus) => void
  ) => UnsubscribeFn

  // chain message types
  chains: (cb: () => void) => UnsubscribeFn
  chainUpsert: (chain: RequestUpsertCustomChain) => Promise<boolean>
  chainRemove: (id: string) => Promise<boolean>
  chainReset: (id: string) => Promise<boolean>
  generateChainSpecsQr: (genesisHash: SignerPayloadGenesisHash) => Promise<HexString>
  generateChainMetadataQr: (
    genesisHash: SignerPayloadGenesisHash,
    specVersion?: number
  ) => Promise<HexString>

  // token message types
  tokens: (cb: () => void) => UnsubscribeFn

  // tokenRates message types
  tokenRates: (cb: () => void) => UnsubscribeFn

  // custom erc20 token management
  addCustomEvmToken: (token: CustomEvmTokenCreate) => Promise<boolean>
  removeCustomEvmToken: (id: string) => Promise<boolean>

  // asset transfer messages
  assetTransfer: (
    chainId: ChainId,
    tokenId: TokenId,
    fromAddress: string,
    toAddress: string,
    amount?: string,
    tip?: string,
    method?: AssetTransferMethod
  ) => Promise<ResponseAssetTransfer>
  assetTransferEth: (
    evmNetworkId: EvmNetworkId,
    tokenId: TokenId,
    fromAddress: EvmAddress,
    toAddress: EvmAddress,
    amount: string,
    gasSettings: EthGasSettings<string>
  ) => Promise<ResponseAssetTransfer>
  assetTransferEthHardware: (
    evmNetworkId: EvmNetworkId,
    tokenId: TokenId,
    amount: string,
    to: EvmAddress,
    unsigned: TransactionRequest<string>,
    signedTransaction: HexString
  ) => Promise<ResponseAssetTransfer>
  assetTransferCheckFees: (
    chainId: ChainId,
    tokenId: TokenId,
    fromAddress: string,
    toAddress: string,
    amount?: string,
    tip?: string,
    method?: AssetTransferMethod
  ) => Promise<ResponseAssetTransferFeeQuery>
  assetTransferApproveSign: (
    unsigned: SignerPayloadJSON,
    signature: `0x${string}`,
    transferInfo: WalletTransactionTransferInfo
  ) => Promise<ResponseAssetTransfer>

  // eth related messages
  ethSignAndSend: (
    evmNetworkId: EvmNetworkId,
    unsigned: TransactionRequest<string>,
    transferInfo?: WalletTransactionTransferInfo
  ) => Promise<HexString>
  ethSendSigned: (
    evmNetworkId: EvmNetworkId,
    unsigned: TransactionRequest<string>,
    signed: HexString,
    transferInfo?: WalletTransactionTransferInfo
  ) => Promise<HexString>
  ethApproveSign: (id: SigningRequestID<"eth-sign">) => Promise<boolean>
  ethApproveSignHardware: (
    id: SigningRequestID<"eth-sign">,
    signature: HexString
  ) => Promise<boolean>
  ethApproveSignAndSend: (
    id: SigningRequestID<"eth-send">,
    transaction: TransactionRequest<string>
  ) => Promise<boolean>
  ethApproveSignAndSendHardware: (
    id: SigningRequestID<"eth-send">,
    unsigned: TransactionRequest<string>,
    signedTransaction: HexString
  ) => Promise<boolean>
  ethCancelSign: (id: SigningRequestID<"eth-sign" | "eth-send">) => Promise<boolean>
  ethRequest: (request: AnyEthRequestChainId) => Promise<unknown>
  ethGetTransactionsCount: (address: EvmAddress, evmNetworkId: EvmNetworkId) => Promise<number>
  ethNetworkAddGetRequests: () => Promise<AddEthereumChainRequest[]>
  ethNetworkAddApprove: (id: AddEthereumChainRequestId, enableDefault: boolean) => Promise<boolean>
  ethNetworkAddCancel: (is: AddEthereumChainRequestId) => Promise<boolean>

  // ethereum networks message types
  ethereumNetworks: (cb: () => void) => UnsubscribeFn
  ethNetworkUpsert: (network: RequestUpsertCustomEvmNetwork) => Promise<boolean>
  ethNetworkRemove: (id: string) => Promise<boolean>
  ethNetworkReset: (id: string) => Promise<boolean>

  // ethereum tokens message types
  ethWatchAssetRequestApprove: (id: WatchAssetRequestId) => Promise<boolean>
  ethWatchAssetRequestCancel: (is: WatchAssetRequestId) => Promise<boolean>

  // substrate rpc calls
  subSend: <T>(
    chainId: ChainId,
    method: string,
    params: unknown[],
    isCacheable?: boolean
  ) => Promise<T>

  // substrate chain metadata
  subChainMetadata: (
    genesisHash: HexString,
    specVersion?: number,
    blockHash?: HexString
  ) => Promise<MetadataDef | undefined>

  assetDiscoveryStartScan: (mode: AssetDiscoveryMode, addresses?: Address[]) => Promise<boolean>
  assetDiscoveryStopScan: () => Promise<boolean>

  nftsSubscribe: (cb: (data: NftData) => void) => UnsubscribeFn
  nftsSetHidden: (id: string, isHidden: boolean) => Promise<boolean>
  nftsSetFavorite: (id: string, isFavorite: boolean) => Promise<boolean>
  nftsRefreshMetadata: (id: string) => Promise<boolean>
}
