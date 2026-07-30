import type {
  AccountProxiesSubscriptionResponse,
  RequestAccountProxiesLoadDetails,
  RequestAccountProxiesRefresh,
  RequestAccountProxiesUpdatePalletCache,
} from "@core/domains/accountProxies/types"
import type { RequestAccountsCatalogAction, Trees } from "@core/domains/accounts/helpers.catalog"
import type {
  RequestAccountContactUpdate,
  RequestAddAccountDerive,
  RequestAddAccountExternal,
  RequestAddAccountKeypair,
  RequestAddressLookup,
} from "@core/domains/accounts/types"
import type {
  AnalyticsCaptureRequest,
  ChangePasswordStatusUpdate,
  LoggedinType,
  QuickUnlockAuthenticateResult,
  QuickUnlockCredentialInfo,
  QuickUnlockEnrollRequest,
  SendFundsOpenRequest,
} from "@core/domains/app/types"
import type {
  AddressesAndTokens,
  BalanceSubscriptionResponse,
  RequestBalance,
} from "@core/domains/balances/types"
import type { BittensorValidator } from "@core/domains/bittensor/exports"
import type { RequestNetworkUpsert } from "@core/domains/chaindata/types"
import type { DefiPosition } from "@core/domains/defi/exports"
import type {
  YieldDto,
  YieldxyzPosition,
  YieldxyzPositionRefreshRequest,
  YieldxyzProvider,
} from "@core/domains/earn/exports"
import type { DecryptRequestId, EncryptRequestId } from "@core/domains/encrypt/types"
import type {
  AddEthereumChainRequestId,
  AnyEthRequestChainId,
  EvmAddress,
  WatchAssetRequestId,
} from "@core/domains/ethereum/types"
import type { Account, Mnemonic } from "@core/domains/keyring/exports"
import type { MetadataUpdateStatus, RequestMetadataId } from "@core/domains/metadata/types"
import type { RequestSetVerifierCertificateMnemonic } from "@core/domains/mnemonics/types"
import type { NftData } from "@core/domains/nfts/exports"
import type { ResponseQueryCacheGet } from "@core/domains/queryCache/types"
import type { ConfirmedExternalAddresses } from "@core/domains/sendFunds/types"
import type {
  SignerPayloadGenesisHash,
  SignerPayloadJSON,
  SigningRequestID,
} from "@core/domains/signing/types"
import type {
  AuthorisedSiteUpdate,
  AuthorizedSite,
  AuthorizedSites,
  AuthRequestAddresses,
  AuthRequestId,
  AuthSolanaSignInApprove,
  ProviderType,
} from "@core/domains/sitesAuthorised/types"
import type {
  RequestSolanaSignApprove,
  ResponseSolanaRpcSend,
  ResponseSolanaSubmit,
  SolRpcRequest,
} from "@core/domains/solana/exports"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import type { KnownRequestId, ValidRequests } from "@core/libs/requests/types"
import type { UnsubscribeFn } from "@core/types"
import type { PjsKeyringPairJson, PjsKeyringPairsJson } from "@core/types/pjsInterop"
import type { IBalance } from "@talismn/balances"
import type { Network, NetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import type { KeypairCurve } from "@talismn/crypto"
import type { NsLookupType } from "@talismn/on-chain-id"
import type { TokenRatesStorage } from "@talismn/token-rates"
import type { HexString, Loadable } from "@talismn/util"
import type { MetadataDef } from "inject/substrate/types"
import type { TransactionRequest } from "viem"

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
    cb: (val: ChangePasswordStatusUpdate) => void
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

  // quick unlock messages -------------------------------------------------------
  quickUnlockEnroll: (data: QuickUnlockEnrollRequest) => Promise<boolean>
  quickUnlockUnenroll: () => Promise<boolean>
  quickUnlockIsEnrolledSubscribe: (cb: (data: { enrolled: boolean }) => void) => UnsubscribeFn
  quickUnlockGetCredentialInfo: () => Promise<QuickUnlockCredentialInfo | null>
  quickUnlockAuthenticate: (prfOutput: string) => Promise<QuickUnlockAuthenticateResult>

  // signing messages -------------------------------------------------------
  cancelSignRequest: (id: SigningRequestID<"substrate-sign" | "vrf-sign">) => Promise<boolean>
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
  approveSignVrf: (id: SigningRequestID<"vrf-sign">) => Promise<boolean>

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
  accountCreateFromJson: (unlockedPairs: PjsKeyringPairJson[]) => Promise<string[]>
  accountExternalSetIsPortfolio: (address: string, isPortfolio: boolean) => Promise<boolean>
  accountsSubscribe: (cb: (accounts: Account[]) => void) => UnsubscribeFn
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
  ) => Promise<{ exportedJson: PjsKeyringPairJson }>
  accountExportAll: (
    password: string,
    exportPw: string
  ) => Promise<{ exportedJson: PjsKeyringPairsJson }>
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
    cb: (balances: BalanceSubscriptionResponse) => void
  ) => UnsubscribeFn

  // account proxy message types ---------------------------------------------
  accountProxies: (cb: (response: AccountProxiesSubscriptionResponse) => void) => UnsubscribeFn
  accountProxiesRefresh: (request: RequestAccountProxiesRefresh) => Promise<boolean>
  accountProxiesLoadDetails: (request: RequestAccountProxiesLoadDetails) => Promise<boolean>
  accountProxiesUpdatePalletCache: (
    request: RequestAccountProxiesUpdatePalletCache
  ) => Promise<boolean>

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
    result: AuthSolanaSignInApprove["result"]
  ) => Promise<boolean>

  metadataUpdatesSubscribe: (
    genesisHash: HexString,
    cb: (status: MetadataUpdateStatus) => void
  ) => UnsubscribeFn

  // chain message types
  generateChainSpecsQr: (genesisHash: SignerPayloadGenesisHash) => Promise<HexString>
  generateChainMetadataQr: (
    genesisHash: SignerPayloadGenesisHash,
    specVersion?: number
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
  registerAdditionalTokenRates: (tokenIds: TokenId[]) => Promise<boolean>

  // eth related messages
  ethSignAndSend: (
    evmNetworkId: NetworkId,
    unsigned: TransactionRequest<string>,
    txInfo?: WalletTransactionInfo
  ) => Promise<HexString>
  ethSendSigned: (
    evmNetworkId: NetworkId,
    unsigned: TransactionRequest<string>,
    signed: HexString,
    txInfo?: WalletTransactionInfo
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
    isCacheable?: boolean
  ) => Promise<T>
  subSubmit: (
    payload: SignerPayloadJSON,
    signature?: HexString,
    txInfo?: WalletTransactionInfo
  ) => Promise<{ hash: HexString }>
  subSubmitWithBittensorMevShield: (
    payload: SignerPayloadJSON,
    txInfo?: WalletTransactionInfo
  ) => Promise<{ hash: HexString; innerHash?: HexString }>

  solSend: (networkId: string, request: SolRpcRequest) => Promise<ResponseSolanaRpcSend>
  solSubmit: (
    networkId: string,
    transaction: string,
    txInfo?: WalletTransactionInfo
  ) => Promise<ResponseSolanaSubmit>
  solSignApprove: (req: RequestSolanaSignApprove) => Promise<void>

  // substrate chain metadata
  subChainMetadata: (
    genesisHash: HexString,
    specVersion?: number
  ) => Promise<MetadataDef | undefined>

  nftsSubscribe: (cb: (data: NftData) => void) => UnsubscribeFn
  nftsSetHidden: (id: string, isHidden: boolean) => Promise<boolean>
  nftsSetFavorite: (id: string, isFavorite: boolean) => Promise<boolean>
  nftsRefreshMetadata: (id: string) => Promise<boolean>

  defiPositionsSubscribe: (cb: (positions: Loadable<DefiPosition[]>) => void) => UnsubscribeFn

  yieldxyzPositionsSubscribe: (
    cb: (positions: Loadable<YieldxyzPosition[]>) => void
  ) => UnsubscribeFn
  yieldxyzPositionRefresh: (args: YieldxyzPositionRefreshRequest) => Promise<void>
  yieldxyzProductsSubscribe: (cb: (positions: Loadable<YieldDto[]>) => void) => UnsubscribeFn
  yieldxyzProvidersSubscribe: (
    cb: (positions: Loadable<YieldxyzProvider[]>) => void
  ) => UnsubscribeFn

  bittensorValidatorsSubscribe: (
    cb: (validators: Loadable<BittensorValidator[]>) => void
  ) => UnsubscribeFn

  gandalfAccessTokenSubscribe: (cb: (data: Loadable<string>) => void) => UnsubscribeFn

  confirmedAddressesSubscribe: (cb: (data: ConfirmedExternalAddresses) => void) => UnsubscribeFn
  addConfirmedAddress: (tokenId: string, address: string) => Promise<boolean>

  // query cache
  queryCacheGet: (key: string) => Promise<ResponseQueryCacheGet>
  queryCacheSet: (
    key: string,
    data: unknown,
    purgeAt: number,
    dataUpdatedAt: number
  ) => Promise<boolean>
  queryCacheRemove: (key: string) => Promise<boolean>
}
