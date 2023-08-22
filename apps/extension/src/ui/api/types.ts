import { Trees } from "@core/domains/accounts/helpers.catalog"
import { AccountAddressType, RequestAccountCreateHardware } from "@core/domains/accounts/types"
import type {
  AccountJson,
  RequestAccountsCatalogAction,
  VerifierCertificateType,
} from "@core/domains/accounts/types"
import {
  AnalyticsCaptureRequest,
  LoggedinType,
  ModalOpenRequest,
  OnboardedType,
  SendFundsOpenRequest,
} from "@core/domains/app/types"
import {
  AddressesByEvmNetwork,
  BalanceJson,
  BalancesUpdate,
  RequestBalance,
  RequestNomPoolStake,
  ResponseNomPoolStake,
} from "@core/domains/balances/types"
import { ChainId } from "@core/domains/chains/types"
import type { DecryptRequestId, EncryptRequestId } from "@core/domains/encrypt/types"
import { AddEthereumChainRequestId } from "@core/domains/ethereum/types"
import {
  AddEthereumChainRequest,
  AnyEthRequestChainId,
  EthGasSettings,
  EvmNetworkId,
  RequestUpsertCustomEvmNetwork,
  WatchAssetRequestId,
} from "@core/domains/ethereum/types"
import { MetadataUpdateStatus, RequestMetadataId } from "@core/domains/metadata/types"
import {
  SignerPayloadGenesisHash,
  SignerPayloadJSON,
  SigningRequestID,
} from "@core/domains/signing/types"
import {
  AuthRequestAddresses,
  AuthRequestId,
  AuthorisedSiteUpdate,
  AuthorizedSite,
  AuthorizedSites,
  ProviderType,
} from "@core/domains/sitesAuthorised/types"
import { CustomErc20TokenCreate, TokenId } from "@core/domains/tokens/types"
import { WalletTransactionTransferInfo } from "@core/domains/transactions"
import {
  AssetTransferMethod,
  ResponseAssetTransfer,
  ResponseAssetTransferFeeQuery,
} from "@core/domains/transfers/types"
import { MetadataDef } from "@core/inject/types"
import { EthResponseType } from "@core/injectEth/types"
import { ValidRequests } from "@core/libs/requests/types"
import { UnsubscribeFn } from "@core/types"
import { AddressesByChain } from "@core/types/base"
import type { KeyringPair$Json } from "@polkadot/keyring/types"
import type { HexString } from "@polkadot/util/types"
import { Address } from "@talismn/balances"
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
  approveMetaRequest: (id: RequestMetadataId) => Promise<boolean>
  rejectMetaRequest: (id: RequestMetadataId) => Promise<boolean>
  allowPhishingSite: (url: string) => Promise<boolean>

  // signing messages -------------------------------------------------------
  cancelSignRequest: (id: SigningRequestID<"substrate-sign">) => Promise<boolean>
  approveSign: (id: SigningRequestID<"substrate-sign">) => Promise<boolean>
  approveSignHardware: (
    id: SigningRequestID<"substrate-sign">,
    signature: HexString
  ) => Promise<boolean>
  approveSignQr: (id: SigningRequestID<"substrate-sign">, signature: HexString) => Promise<boolean>

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
  addressFromMnemonic: (mnemonic: string, type?: AccountAddressType) => Promise<string>

  // account message types ---------------------------------------------------
  accountCreate: (name: string, type: AccountAddressType) => Promise<string>
  accountCreateFromSeed: (name: string, seed: string, type?: AccountAddressType) => Promise<string>
  accountCreateFromJson: (unlockedPairs: KeyringPair$Json[]) => Promise<string[]>
  accountCreateHardware: (
    request: Omit<RequestAccountCreateHardware, "hardwareType">
  ) => Promise<string>
  accountCreateHardwareEthereum: (name: string, address: string, path: string) => Promise<string>
  accountCreateQr: (name: string, address: string, genesisHash: HexString | null) => Promise<string>
  accountCreateWatched: (name: string, address: string, isPortfolio: boolean) => Promise<string>
  accountExternalSetIsPortfolio: (address: string, isPortfolio: boolean) => Promise<boolean>
  accountsSubscribe: (cb: (accounts: AccountJson[]) => void) => UnsubscribeFn
  accountsCatalogSubscribe: (cb: (trees: Trees) => void) => UnsubscribeFn
  accountsCatalogRunActions: (actions: RequestAccountsCatalogAction[]) => Promise<boolean>
  accountForget: (address: string) => Promise<boolean>
  accountExport: (
    address: string,
    password: string,
    exportPw: string
  ) => Promise<{ exportedJson: KeyringPair$Json }>
  accountExportPrivateKey: (address: string, password: string) => Promise<string>
  accountRename: (address: string, name: string) => Promise<boolean>
  accountValidateMnemonic: (mnemonic: string) => Promise<boolean>
  setVerifierCertMnemonic: (type: VerifierCertificateType, mnemonic?: string) => Promise<boolean>

  // balance message types ---------------------------------------------------
  getBalance: ({
    chainId,
    evmNetworkId,
    tokenId,
    address,
  }: RequestBalance) => Promise<BalanceJson | undefined>
  getNomPoolStakedBalance: ({
    chainId,
    addresses,
  }: RequestNomPoolStake) => Promise<ResponseNomPoolStake>
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
  authorizedSiteUpdate: (id: string, authorisedSite: AuthorisedSiteUpdate) => Promise<boolean>

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
  generateChainSpecsQr: (genesisHash: SignerPayloadGenesisHash) => Promise<HexString>
  generateChainMetadataQr: (
    genesisHash: SignerPayloadGenesisHash,
    specVersion: number
  ) => Promise<HexString>

  // token message types
  tokens: (cb: () => void) => UnsubscribeFn

  // tokenRates message types
  tokenRates: (cb: () => void) => UnsubscribeFn

  // custom erc20 token management
  addCustomErc20Token: (token: CustomErc20TokenCreate) => Promise<boolean>
  removeCustomErc20Token: (id: string) => Promise<boolean>

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
    fromAddress: string,
    toAddress: string,
    amount: string,
    gasSettings: EthGasSettings
  ) => Promise<ResponseAssetTransfer>
  assetTransferEthHardware: (
    evmNetworkId: EvmNetworkId,
    tokenId: TokenId,
    amount: string,
    to: Address,
    unsigned: ethers.providers.TransactionRequest,
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
    unsigned: ethers.providers.TransactionRequest,
    transferInfo?: WalletTransactionTransferInfo
  ) => Promise<HexString>
  ethSendSigned: (
    unsigned: ethers.providers.TransactionRequest,
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
    transaction: ethers.providers.TransactionRequest
  ) => Promise<boolean>
  ethApproveSignAndSendHardware: (
    id: SigningRequestID<"eth-send">,
    unsigned: ethers.providers.TransactionRequest,
    signedTransaction: HexString
  ) => Promise<boolean>
  ethCancelSign: (id: SigningRequestID<"eth-sign" | "eth-send">) => Promise<boolean>
  ethRequest: <T extends AnyEthRequestChainId>(request: T) => Promise<EthResponseType<T["method"]>>
  ethGetTransactionsCount: (address: string, evmNetworkId: EvmNetworkId) => Promise<number>
  ethNetworkAddGetRequests: () => Promise<AddEthereumChainRequest[]>
  ethNetworkAddApprove: (id: AddEthereumChainRequestId) => Promise<boolean>
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
}
