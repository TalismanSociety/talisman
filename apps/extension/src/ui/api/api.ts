import { HexString } from "@polkadot/util/types"
import {
  ResponseSolanaSubmit,
  SignerPayloadJSON,
  SolRpcRequest,
  SolRpcResponse,
  WalletTransactionInfo,
} from "extension-core"

import PortMessageService from "@common/PortMessageService"

import MessageTypes from "./types"

const messageService = new PortMessageService()

export const api: MessageTypes = {
  keepalive: () => messageService.sendMessage("pri(keepalive)"),
  keepunlocked: () => messageService.sendMessage("pri(keepunlocked)"),
  unsubscribe: (id) => messageService.sendMessage("pri(unsubscribe)", { id }),
  // UNSORTED
  onboardCreatePassword: (pass, passConfirm) =>
    messageService.sendMessage("pri(app.onboardCreatePassword)", { pass, passConfirm }),
  authenticate: (pass) => messageService.sendMessage("pri(app.authenticate)", { pass }),
  lock: () => messageService.sendMessage("pri(app.lock)"),
  changePassword: (currentPw, newPw, newPwConfirm) =>
    messageService.sendMessage("pri(app.changePassword)", { currentPw, newPw, newPwConfirm }),
  changePasswordSubscribe: (currentPw, newPw, newPwConfirm, cb) =>
    messageService.subscribe(
      "pri(app.changePassword.subscribe)",
      { currentPw, newPw, newPwConfirm },
      cb,
    ),
  checkPassword: (password) => messageService.sendMessage("pri(app.checkPassword)", { password }),
  authStatus: () => messageService.sendMessage("pri(app.authStatus)"),
  authStatusSubscribe: (cb) => messageService.subscribe("pri(app.authStatus.subscribe)", null, cb),
  dashboardOpen: (route) => messageService.sendMessage("pri(app.dashboardOpen)", { route }),
  onboardOpen: () => messageService.sendMessage("pri(app.onboardOpen)"),
  popupOpen: (argument?: string) => messageService.sendMessage("pri(app.popupOpen)", argument),
  promptLogin: () => messageService.sendMessage("pri(app.promptLogin)"),
  approveMetaRequest: (id) => messageService.sendMessage("pri(metadata.approve)", { id }),
  rejectMetaRequest: (id) => messageService.sendMessage("pri(metadata.reject)", { id }),
  allowPhishingSite: (url) => messageService.sendMessage("pri(app.phishing.addException)", { url }),

  // app messages -------------------------------------------------------
  analyticsCapture: (request) => messageService.sendMessage("pri(app.analyticsCapture)", request),
  sendFundsOpen: (request = {}) => messageService.sendMessage("pri(app.sendFunds.open)", request),
  resetWallet: () => messageService.sendMessage("pri(app.resetWallet)"),
  subscribeRequests: (cb) => messageService.subscribe("pri(app.requests)", null, cb),

  // signing messages ------------------------------------------------
  cancelSignRequest: (id) => messageService.sendMessage("pri(signing.cancel)", { id }),
  approveSign: (id, payload) =>
    messageService.sendMessage("pri(signing.approveSign)", {
      id,
      payload,
    }),
  approveSignHardware: (id, signature, payload) =>
    messageService.sendMessage("pri(signing.approveSign.hardware)", {
      id,
      signature,
      payload,
    }),
  approveSignQr: (id, signature, payload) =>
    messageService.sendMessage("pri(signing.approveSign.qr)", {
      id,
      signature,
      payload,
    }),
  approveSignSignet: (id) => messageService.sendMessage("pri(signing.approveSign.signet)", { id }),

  // encrypt messages -------------------------------------------------------
  approveEncrypt: (id) =>
    messageService.sendMessage("pri(encrypt.approveEncrypt)", {
      id,
    }),
  approveDecrypt: (id) =>
    messageService.sendMessage("pri(encrypt.approveDecrypt)", {
      id,
    }),
  cancelEncryptRequest: (id) => messageService.sendMessage("pri(encrypt.cancel)", { id }),

  // mnemonic messages -------------------------------------------------------
  mnemonicsSubscribe: (cb) => messageService.subscribe("pri(mnemonics.subscribe)", null, cb),
  mnemonicUnlock: (mnemonicId, password) =>
    messageService.sendMessage("pri(mnemonics.unlock)", { mnemonicId, password }),
  mnemonicConfirm: (mnemonicId, confirmed: boolean) =>
    messageService.sendMessage("pri(mnemonics.confirm)", { mnemonicId, confirmed }),
  mnemonicRename: (mnemonicId, name) =>
    messageService.sendMessage("pri(mnemonics.rename)", { mnemonicId, name }),
  mnemonicDelete: (mnemonicId) =>
    messageService.sendMessage("pri(mnemonics.delete)", { mnemonicId }),
  validateMnemonic: (mnemonic) =>
    messageService.sendMessage("pri(mnemonics.validateMnemonic)", mnemonic),
  setVerifierCertMnemonic: (options) =>
    messageService.sendMessage("pri(mnemonics.setVerifierCertMnemonic)", options),

  // account messages ---------------------------------------------------
  accountAddExternal: (options) =>
    messageService.sendMessage("pri(accounts.add.external)", options),
  accountAddDerive: (options) => messageService.sendMessage("pri(accounts.add.derive)", options),
  accountAddKeypair: (options) => messageService.sendMessage("pri(accounts.add.keypair)", options),
  accountCreateFromJson: (unlockedPairs) =>
    messageService.sendMessage("pri(accounts.create.json)", { unlockedPairs }),
  accountsSubscribe: (cb) => messageService.subscribe("pri(accounts.subscribe)", null, cb),
  accountsCatalogSubscribe: (cb) =>
    messageService.subscribe("pri(accounts.catalog.subscribe)", null, cb),
  accountsCatalogRunActions: (actions) =>
    messageService.sendMessage("pri(accounts.catalog.runActions)", actions),
  accountsOnChainIdsResolveNames: (names) =>
    messageService.sendMessage("pri(accounts.onChainIds.resolveNames)", names),
  accountsOnChainIdsLookupAddresses: (addresses) =>
    messageService.sendMessage("pri(accounts.onChainIds.lookupAddresses)", addresses),
  accountForget: (address) => messageService.sendMessage("pri(accounts.forget)", { address }),
  accountExport: (address, password, exportPw) =>
    messageService.sendMessage("pri(accounts.export)", { address, password, exportPw }),
  accountExportPrivateKey: (address, password) =>
    messageService.sendMessage("pri(accounts.export.pk)", { address, password }),
  accountExportAll: (password, exportPw) =>
    messageService.sendMessage("pri(accounts.export.all)", { password, exportPw }),
  accountRename: (address, name) =>
    messageService.sendMessage("pri(accounts.rename)", { address, name }),
  accountUpdateContact: (options) =>
    messageService.sendMessage("pri(accounts.update.contact)", options),
  accountExternalSetIsPortfolio: (address, isPortfolio) =>
    messageService.sendMessage("pri(accounts.external.setIsPortfolio)", { address, isPortfolio }),
  addressLookup: (lookup) => messageService.sendMessage("pri(accounts.address.lookup)", lookup),
  getNextDerivationPath: (mnemonicId, curve) =>
    messageService.sendMessage("pri(accounts.derivationPath.next)", { mnemonicId, curve }),

  // balance messages ---------------------------------------------------
  getBalance: ({ tokenId, address }) =>
    messageService.sendMessage("pri(balances.get)", { tokenId, address }),
  balances: (cb) => messageService.subscribe("pri(balances.subscribe)", null, cb),
  balancesByParams: (addressesAndTokens, cb) =>
    messageService.subscribe(
      "pri(balances.byparams.subscribe)",
      {
        addressesAndTokens,
      },
      cb,
    ),

  // authorized sites messages ------------------------------------------
  authorizedSites: () => messageService.sendMessage("pri(sites.list)"),
  authorizedSitesSubscribe: (cb) => messageService.subscribe("pri(sites.subscribe)", null, cb),
  authorizedSite: (id) => messageService.sendMessage("pri(sites.byid)", { id }),
  authorizedSiteSubscribe: (id, cb) =>
    messageService.subscribe("pri(sites.byid.subscribe)", { id }, cb),
  authorizedSiteForget: (id, type) => messageService.sendMessage("pri(sites.forget)", { id, type }),
  authorizedSiteUpdate: (id, authorisedSite) =>
    messageService.sendMessage("pri(sites.update)", { id, authorisedSite }),
  authorizedSitesDisconnectAll: (type) =>
    messageService.sendMessage("pri(sites.disconnect.all)", { type }),
  authorizedSitesForgetAll: (type) => messageService.sendMessage("pri(sites.forget.all)", { type }),

  // authorization requests messages ------------------------------------
  authrequestApprove: (id, addresses) =>
    messageService.sendMessage("pri(sites.requests.approve)", { id, addresses }),
  authrequestReject: (id) => messageService.sendMessage("pri(sites.requests.reject)", { id }),
  authrequestIgnore: (id) => messageService.sendMessage("pri(sites.requests.ignore)", { id }),
  authrequestApproveSolSignIn: (id, result) =>
    messageService.sendMessage("pri(sites.requests.approveSolSignIn)", { id, result }),

  // track metadata updates ----------------------------------------------
  metadataUpdatesSubscribe: (genesisHash, cb) =>
    messageService.subscribe("pri(metadata.updates.subscribe)", { id: genesisHash }, cb),

  // chain message types
  generateChainSpecsQr: (genesisHash) =>
    messageService.sendMessage("pri(chains.generateQr.addNetworkSpecs)", { genesisHash }),
  generateChainMetadataQr: (genesisHash, specVersion) =>
    messageService.sendMessage("pri(chains.generateQr.updateNetworkMetadata)", {
      genesisHash,
      specVersion,
    }),

  // chaindata message types
  networks: (cb) => messageService.subscribe("pri(chaindata.networks.subscribe)", null, cb),
  networkUpsert: ({ platform, network, nativeToken }) =>
    messageService.sendMessage("pri(chaindata.networks.upsert)", {
      platform,
      network,
      nativeToken,
    }),
  networkRemove: (id) => messageService.sendMessage("pri(chaindata.networks.remove)", { id }),

  tokens: (cb) => messageService.subscribe("pri(chaindata.tokens.subscribe)", null, cb),
  tokenUpsert: (token) => messageService.sendMessage("pri(chaindata.tokens.upsert)", token),
  tokenRemove: (id) => messageService.sendMessage("pri(chaindata.tokens.remove)", { id }),

  // tokenRates message types
  tokenRates: (cb) => messageService.subscribe("pri(tokenRates.subscribe)", null, cb),

  // eth related messages
  ethSignAndSend: (evmNetworkId, unsigned, txInfo) =>
    messageService.sendMessage("pri(eth.signing.signAndSend)", {
      evmNetworkId,
      unsigned,
      txInfo,
    }),
  ethSendSigned: (evmNetworkId, unsigned, signed, txInfo) =>
    messageService.sendMessage("pri(eth.signing.sendSigned)", {
      evmNetworkId,
      unsigned,
      signed,
      txInfo,
    }),
  ethApproveSign: (id) =>
    messageService.sendMessage("pri(eth.signing.approveSign)", {
      id,
    }),
  ethApproveSignHardware: (id, signedPayload) =>
    messageService.sendMessage("pri(eth.signing.approveSignHardware)", {
      id,
      signedPayload,
    }),
  ethApproveSignAndSend: (id, transaction) =>
    messageService.sendMessage("pri(eth.signing.approveSignAndSend)", {
      id,
      transaction,
    }),
  ethApproveSignAndSendHardware: (id, unsigned, signedPayload) =>
    messageService.sendMessage("pri(eth.signing.approveSignAndSendHardware)", {
      id,
      unsigned,
      signedPayload,
    }),
  ethCancelSign: (id) =>
    messageService.sendMessage("pri(eth.signing.cancel)", {
      id,
    }),
  ethRequest: (request) => messageService.sendMessage("pri(eth.request)", request),
  ethGetTransactionsCount: (address, evmNetworkId) =>
    messageService.sendMessage("pri(eth.transactions.count)", { address, evmNetworkId }),
  ethNetworkAddApprove: (id) => messageService.sendMessage("pri(eth.networks.add.approve)", { id }),
  ethNetworkAddCancel: (id) => messageService.sendMessage("pri(eth.networks.add.cancel)", { id }),

  // ethereum watch assets
  ethWatchAssetRequestApprove: (id) =>
    messageService.sendMessage("pri(eth.watchasset.requests.approve)", { id }),
  ethWatchAssetRequestCancel: (id) =>
    messageService.sendMessage("pri(eth.watchasset.requests.cancel)", { id }),

  // substrate rpc messages
  subSend: <T>(chainId: string, method: string, params: unknown[], isCacheable?: boolean) =>
    messageService.sendMessage("pri(substrate.rpc.send)", {
      chainId,
      method,
      params,
      isCacheable,
    }) as Promise<T>,
  subSubmit: (payload: SignerPayloadJSON, signature?: HexString, txInfo?: WalletTransactionInfo) =>
    messageService.sendMessage("pri(substrate.rpc.submit)", {
      payload,
      signature,
      txInfo,
    }),
  subSubmitWithBittensorMevShield: (payload: SignerPayloadJSON, txInfo?: WalletTransactionInfo) =>
    messageService.sendMessage("pri(substrate.rpc.submit.withBittensorMevShield)", {
      payload,
      txInfo,
    }),
  subChainMetadata: (genesisHash, specVersion) =>
    messageService.sendMessage("pri(substrate.metadata.get)", {
      genesisHash,
      specVersion,
    }),

  // solana
  solSend: <T>(networkId: string, request: SolRpcRequest) =>
    messageService.sendMessage("pri(solana.rpc.send)", {
      networkId,
      request,
    }) as Promise<SolRpcResponse<T>>,
  solSubmit: (networkId: string, transaction: string, txInfo?: WalletTransactionInfo) =>
    messageService.sendMessage("pri(solana.rpc.submit)", {
      networkId,
      transaction,
      txInfo,
    }) as Promise<ResponseSolanaSubmit>,
  solSignApprove: (req) =>
    messageService.sendMessage("pri(solana.sign.approve)", req) as Promise<void>,

  // asset discovery
  assetDiscoveryStartScan: (scope) =>
    messageService.sendMessage("pri(assetDiscovery.scan.start)", scope),
  assetDiscoveryStopScan: () => messageService.sendMessage("pri(assetDiscovery.scan.stop)", null),

  // nfts
  nftsSubscribe: (cb) => messageService.subscribe("pri(nfts.subscribe)", null, cb),
  nftsSetHidden: (id, isHidden) =>
    messageService.sendMessage("pri(nfts.collection.setHidden)", { id, isHidden }),
  nftsSetFavorite: (id, isFavorite) =>
    messageService.sendMessage("pri(nfts.setFavorite)", { id, isFavorite }),
  nftsRefreshMetadata: (id) => messageService.sendMessage("pri(nfts.refreshMetadata)", { id }),

  defiPositionsSubscribe: (cb) =>
    messageService.subscribe("pri(defi.positions.subscribe)", null, cb),

  // bittensor
  bittensorValidatorsSubscribe: (cb) =>
    messageService.subscribe("pri(bittensor.validators.subscribe)", null, cb),

  // sendFunds
  confirmedAddressesSubscribe: (cb) =>
    messageService.subscribe("pri(sendFunds.confirmedAddresses.subscribe)", null, cb),
  addConfirmedAddress: (tokenId, address) =>
    messageService.sendMessage("pri(sendFunds.confirmedAddresses.add)", { tokenId, address }),
}
