import type { KeyringPair$Json } from "@polkadot/keyring/types"
import type { KeyringPairs$Json } from "@polkadot/ui-keyring/types"
import type { HexString } from "@polkadot/util/types"
import { IBalance } from "@talismn/balances"
import { Network, NetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import { KeypairCurve } from "@talismn/crypto"
import { NsLookupType } from "@talismn/on-chain-id"
import { TokenRatesStorage } from "@talismn/token-rates"
import { Loadable } from "@talismn/util"
import {
  Account,
  AddEthereumChainRequestId,
  AddressesAndTokens,
  AnalyticsCaptureRequest,
  AnyEthRequestChainId,
  AssetDiscoveryScanScope,
  AuthorisedSiteUpdate,
  AuthorizedSite,
  AuthorizedSites,
  AuthRequestAddresses,
  AuthRequestId,
  AuthSolanaSignInApprove,
  BalanceSubscriptionResponse,
  BittensorValidator,
  ChangePasswordStatusUpdate,
  ConfirmedExternalAddresses,
  DecryptRequestId,
  DefiPosition,
  EncryptRequestId,
  EvmAddress,
  KnownRequestId,
  LoggedinType,
  MetadataUpdateStatus,
  Mnemonic,
  NftData,
  ProviderType,
  RequestAccountContactUpdate,
  RequestAccountsCatalogAction,
  RequestAddAccountDerive,
  RequestAddAccountExternal,
  RequestAddAccountKeypair,
  RequestAddressLookup,
  RequestBalance,
  RequestMetadataId,
  RequestNetworkUpsert,
  RequestSetVerifierCertificateMnemonic,
  RequestSolanaSignApprove,
  ResponseSolanaSubmit,
  SendFundsOpenRequest,
  SignerPayloadGenesisHash,
  SignerPayloadJSON,
  SigningRequestID,
  SolRpcRequest,
  SolRpcResponse,
  Trees,
  UnsubscribeFn,
  ValidRequests,
  WalletTransactionInfo,
  WatchAssetRequestId,
} from "extension-core"
import { MetadataDef } from "inject/substrate/types"
import { TransactionRequest } from "viem"

export default interface MessageTypes {
  keepalive: () => Promise<boolean>
  keepunlocked: () => Promise<boolean>
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
    cb: (val: ChangePasswordStatusUpdate) => void,
  ) => UnsubscribeFn
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
    payload?: SignerPayloadJSON,
  ) => Promise<boolean>
  approveSignHardware: (
    id: SigningRequestID<"substrate-sign">,
    signature: HexString,
    payload?: SignerPayloadJSON,
  ) => Promise<boolean>
  approveSignQr: (
    id: SigningRequestID<"substrate-sign">,
    signature: HexString,
    payload?: SignerPayloadJSON,
  ) => Promise<boolean>
  approveSignSignet: (id: SigningRequestID<"substrate-sign">) => Promise<boolean>

  // encrypt messages -------------------------------------------------------
  approveEncrypt: (id: EncryptRequestId) => Promise<boolean>
  approveDecrypt: (id: DecryptRequestId) => Promise<boolean>
  cancelEncryptRequest: (id: DecryptRequestId | EncryptRequestId) => Promise<boolean>

  // app message types -------------------------------------------------------
  analyticsCapture: (request: AnalyticsCaptureRequest) => Promise<boolean>
  sendFundsOpen: (request?: SendFundsOpenRequest) => Promise<boolean>
  resetWallet: () => Promise<boolean>
  subscribeRequests: (cb: (request: ValidRequests[]) => void) => UnsubscribeFn

  // mnemonic message types -------------------------------------------------------
  mnemonicsSubscribe: (cb: (mnemonics: Mnemonic[]) => void) => UnsubscribeFn
  mnemonicUnlock: (mnemonicId: string, pass: string) => Promise<string>
  mnemonicConfirm: (mnemonicId: string, confirmed: boolean) => Promise<boolean>
  mnemonicRename: (mnemonicId: string, name: string) => Promise<boolean>
  mnemonicDelete: (mnemonicId: string) => Promise<boolean>
  validateMnemonic: (mnemonic: string) => Promise<boolean>
  setVerifierCertMnemonic: (options: RequestSetVerifierCertificateMnemonic) => Promise<boolean>

  // account message types ---------------------------------------------------
  accountAddExternal: (options: RequestAddAccountExternal) => Promise<string[]>
  accountAddDerive: (options: RequestAddAccountDerive) => Promise<string[]>
  accountAddKeypair: (options: RequestAddAccountKeypair) => Promise<string[]>
  accountCreateFromJson: (unlockedPairs: KeyringPair$Json[]) => Promise<string[]>
  accountExternalSetIsPortfolio: (address: string, isPortfolio: boolean) => Promise<boolean>
  accountsSubscribe: (cb: (accounts: Account[]) => void) => UnsubscribeFn
  accountsCatalogSubscribe: (cb: (trees: Trees) => void) => UnsubscribeFn
  accountsCatalogRunActions: (actions: RequestAccountsCatalogAction[]) => Promise<boolean>
  accountsOnChainIdsResolveNames: (
    names: string[],
  ) => Promise<Record<string, [string, NsLookupType] | null>>
  accountsOnChainIdsLookupAddresses: (addresses: string[]) => Promise<Record<string, string | null>>
  accountForget: (address: string) => Promise<boolean>
  accountExport: (
    address: string,
    password: string,
    exportPw: string,
  ) => Promise<{ exportedJson: KeyringPair$Json }>
  accountExportAll: (
    password: string,
    exportPw: string,
  ) => Promise<{ exportedJson: KeyringPairs$Json }>
  accountExportPrivateKey: (address: string, password: string) => Promise<string>
  accountRename: (address: string, name: string) => Promise<boolean>
  accountUpdateContact: (options: RequestAccountContactUpdate) => Promise<boolean>
  addressLookup: (lookup: RequestAddressLookup) => Promise<string>
  getNextDerivationPath: (mnemonicId: string, curve: KeypairCurve) => Promise<string>

  // balance message types ---------------------------------------------------
  getBalance: ({ tokenId, address }: RequestBalance) => Promise<IBalance | null>
  balances: (cb: (balances: BalanceSubscriptionResponse) => void) => UnsubscribeFn
  balancesByParams: (
    addressesAndTokens: AddressesAndTokens,
    cb: (balances: BalanceSubscriptionResponse) => void,
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
  authrequestApproveSolSignIn: (
    id: KnownRequestId<"auth-sol-signIn">,
    result: AuthSolanaSignInApprove["result"],
  ) => Promise<boolean>

  metadataUpdatesSubscribe: (
    genesisHash: HexString,
    cb: (status: MetadataUpdateStatus) => void,
  ) => UnsubscribeFn

  // chain message types
  generateChainSpecsQr: (genesisHash: SignerPayloadGenesisHash) => Promise<HexString>
  generateChainMetadataQr: (
    genesisHash: SignerPayloadGenesisHash,
    specVersion?: number,
  ) => Promise<HexString>

  // networks message types
  networks: (cb: (chains: Array<Network>) => void) => UnsubscribeFn
  networkUpsert: (req: RequestNetworkUpsert) => Promise<boolean>
  networkRemove: (id: NetworkId) => Promise<boolean>

  // token message types
  tokens: (cb: (tokens: Token[]) => void) => UnsubscribeFn
  tokenUpsert: (token: Token) => Promise<boolean>
  tokenRemove: (id: TokenId) => Promise<boolean>

  // tokenRates message types
  tokenRates: (cb: (rates: TokenRatesStorage) => void) => UnsubscribeFn

  // eth related messages
  ethSignAndSend: (
    evmNetworkId: NetworkId,
    unsigned: TransactionRequest<string>,
    txInfo?: WalletTransactionInfo,
  ) => Promise<HexString>
  ethSendSigned: (
    evmNetworkId: NetworkId,
    unsigned: TransactionRequest<string>,
    signed: HexString,
    txInfo?: WalletTransactionInfo,
  ) => Promise<HexString>
  ethApproveSign: (id: SigningRequestID<"eth-sign">) => Promise<boolean>
  ethApproveSignHardware: (
    id: SigningRequestID<"eth-sign">,
    signature: HexString,
  ) => Promise<boolean>
  ethApproveSignAndSend: (
    id: SigningRequestID<"eth-send">,
    transaction: TransactionRequest<string>,
  ) => Promise<boolean>
  ethApproveSignAndSendHardware: (
    id: SigningRequestID<"eth-send">,
    unsigned: TransactionRequest<string>,
    signedTransaction: HexString,
  ) => Promise<boolean>
  ethCancelSign: (id: SigningRequestID<"eth-sign" | "eth-send">) => Promise<boolean>
  ethRequest: (request: AnyEthRequestChainId) => Promise<unknown>
  ethGetTransactionsCount: (address: EvmAddress, evmNetworkId: NetworkId) => Promise<number>
  ethNetworkAddApprove: (id: AddEthereumChainRequestId) => Promise<boolean>
  ethNetworkAddCancel: (is: AddEthereumChainRequestId) => Promise<boolean>

  // ethereum tokens message types
  ethWatchAssetRequestApprove: (id: WatchAssetRequestId) => Promise<boolean>
  ethWatchAssetRequestCancel: (is: WatchAssetRequestId) => Promise<boolean>

  // substrate rpc calls
  subSend: <T>(
    chainId: NetworkId,
    method: string,
    params: unknown[],
    isCacheable?: boolean,
  ) => Promise<T>
  subSubmit: (
    payload: SignerPayloadJSON,
    signature?: HexString,
    txInfo?: WalletTransactionInfo,
  ) => Promise<{ hash: HexString }>
  subSubmitWithBittensorMevShield: (
    payload: SignerPayloadJSON,
    txInfo?: WalletTransactionInfo,
  ) => Promise<{ hash: HexString }>

  solSend: <T>(networkId: string, request: SolRpcRequest) => Promise<SolRpcResponse<T>>
  solSubmit: (
    networkId: string,
    transaction: string,
    txInfo?: WalletTransactionInfo,
  ) => Promise<ResponseSolanaSubmit>
  solSignApprove: (req: RequestSolanaSignApprove) => Promise<void>

  // substrate chain metadata
  subChainMetadata: (
    genesisHash: HexString,
    specVersion?: number,
  ) => Promise<MetadataDef | undefined>

  assetDiscoveryStartScan: (scope: AssetDiscoveryScanScope) => Promise<boolean>
  assetDiscoveryStopScan: () => Promise<boolean>

  nftsSubscribe: (cb: (data: NftData) => void) => UnsubscribeFn
  nftsSetHidden: (id: string, isHidden: boolean) => Promise<boolean>
  nftsSetFavorite: (id: string, isFavorite: boolean) => Promise<boolean>
  nftsRefreshMetadata: (id: string) => Promise<boolean>

  defiPositionsSubscribe: (cb: (positions: Loadable<DefiPosition[]>) => void) => UnsubscribeFn

  bittensorValidatorsSubscribe: (
    cb: (validators: Loadable<BittensorValidator[]>) => void,
  ) => UnsubscribeFn

  confirmedAddressesSubscribe: (cb: (data: ConfirmedExternalAddresses) => void) => UnsubscribeFn
  addConfirmedAddress: (tokenId: string, address: string) => Promise<boolean>
}
