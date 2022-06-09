import MessageTypes from "./types"
import MessageService from "@core/libs/MessageService"
import { PORT_EXTENSION } from "@core/constants"
import { EthereumNetwork } from "@core/types"

const port = chrome.runtime.connect({ name: PORT_EXTENSION })
const messageService = new MessageService({
  origin: "talisman-extension",
  messageSource: port,
})
port.onMessage.addListener(messageService.handleResponse)

export const api: MessageTypes = {
  unsubscribe: (id) => messageService.sendMessage("pri(unsubscribe)", { id }),
  // UNSORTED
  onboard: (name, pass, passConfirm, mnemonic) =>
    messageService.sendMessage("pri(app.onboard)", { name, pass, passConfirm, mnemonic }),
  authenticate: (pass) => messageService.sendMessage("pri(app.authenticate)", { pass }),
  lock: () => messageService.sendMessage("pri(app.lock)"),
  authStatus: () => messageService.sendMessage("pri(app.authStatus)"),
  authStatusSubscribe: (cb) => messageService.subscribe("pri(app.authStatus.subscribe)", null, cb),
  onboardStatus: () => messageService.sendMessage("pri(app.onboardStatus)"),
  onboardStatusSubscribe: (cb) =>
    messageService.subscribe("pri(app.onboardStatus.subscribe)", null, cb),
  setOnboarded: () => messageService.sendMessage("pri(meta.onboard)"),
  dashboardOpen: (route) => messageService.sendMessage("pri(app.dashboardOpen)", { route }),
  onboardOpen: () => messageService.sendMessage("pri(app.onboardOpen)"),
  popupOpen: () => messageService.sendMessage("pri(app.popupOpen)"),
  promptLogin: (closeOnSuccess = false) =>
    messageService.sendMessage("pri(app.promptLogin)", closeOnSuccess),
  approveMetaRequest: (id) => messageService.sendMessage("pri(metadata.approve)", { id }),
  rejectMetaRequest: (id) => messageService.sendMessage("pri(metadata.reject)", { id }),
  subscribeMetadataRequests: (cb) => messageService.subscribe("pri(metadata.requests)", null, cb),

  // app messages -------------------------------------------------------
  modalOpen: (modalType) => messageService.sendMessage("pri(app.modalOpen.request)", { modalType }),
  modalOpenSubscribe: (cb) => messageService.subscribe("pri(app.modalOpen.subscribe)", null, cb),

  // signing messages ------------------------------------------------
  cancelSignRequest: (id) => messageService.sendMessage("pri(signing.cancel)", { id }),
  decodeSignRequest: (id) => messageService.sendMessage("pri(signing.decode)", { id }),
  subscribeSigningRequests: (cb) => messageService.subscribe("pri(signing.requests)", null, cb),
  subscribeSigningRequest: (id: string, cb) =>
    messageService.subscribe("pri(signing.byid.subscribe)", { id }, cb),
  approveSign: (id) =>
    messageService.sendMessage("pri(signing.approveSign)", {
      id,
    }),
  approveSignHardware: (id, signature) =>
    messageService.sendMessage("pri(signing.approveSign.hardware)", {
      id,
      signature,
    }),

  // mnemonic messages -------------------------------------------------------
  mnemonicUnlock: (pass) => messageService.sendMessage("pri(mnemonic.unlock)", pass),
  mnemonicConfirm: (confirmed: boolean) =>
    messageService.sendMessage("pri(mnemonic.confirm)", confirmed),
  mnemonicSubscribe: (cb) => messageService.subscribe("pri(mnemonic.subscribe)", null, cb),
  addressFromMnemonic: (mnemonic, type) =>
    messageService.sendMessage("pri(mnemonic.address)", { mnemonic, type }),

  // account messages ---------------------------------------------------
  accountCreate: (name, type) => messageService.sendMessage("pri(accounts.create)", { name, type }),
  accountCreateFromSeed: (name, seed, type) =>
    messageService.sendMessage("pri(accounts.create.seed)", { name, seed, type }),
  accountCreateFromJson: (json, password) =>
    messageService.sendMessage("pri(accounts.create.json)", { json, password }),
  accountCreateHardware: ({ accountIndex, address, addressOffset, genesisHash, name }) =>
    messageService.sendMessage("pri(accounts.create.hardware)", {
      accountIndex,
      address,
      addressOffset,
      genesisHash,
      name,
    }),
  accountsSubscribe: (cb) => messageService.subscribe("pri(accounts.subscribe)", null, cb),
  accountForget: (address) => messageService.sendMessage("pri(accounts.forget)", { address }),
  accountExport: (address) => messageService.sendMessage("pri(accounts.export)", { address }),
  accountRename: (address, name) =>
    messageService.sendMessage("pri(accounts.rename)", { address, name }),
  accountValidateMnemonic: (mnemonic) =>
    messageService.sendMessage("pri(accounts.validateMnemonic)", mnemonic),

  // balance messages ---------------------------------------------------
  subscribeBalances: (cb) => messageService.subscribe("pri(balances.subscribe)", null, cb),
  subscribeBalancesById: (id, cb) =>
    messageService.subscribe("pri(balances.byid.subscribe)", { id }, cb),
  getBalance: ({ chainId, tokenId, address }) =>
    messageService.sendMessage("pri(balances.get)", { chainId, tokenId, address }),
  subscribeBalancesByParams: (addressesByChain, cb) =>
    messageService.subscribe("pri(balances.byparams.subscribe)", { addressesByChain }, cb),

  // authorized sites messages ------------------------------------------
  authorizedSites: () => messageService.sendMessage("pri(sites.list)"),
  authorizedSitesSubscribe: (cb) => messageService.subscribe("pri(sites.subscribe)", null, cb),
  authorizedSite: (id) => messageService.sendMessage("pri(sites.byid)", { id }),
  authorizedSiteSubscribe: (id, cb) =>
    messageService.subscribe("pri(sites.byid.subscribe)", { id }, cb),
  authorizedSiteForget: (id, type) => messageService.sendMessage("pri(sites.forget)", { id, type }),
  authorizedSiteUpdate: (id, props) =>
    messageService.sendMessage("pri(sites.update)", { id, props }),

  // authorization requests messages ------------------------------------
  authRequestsSubscribe: (cb) =>
    messageService.subscribe("pri(sites.requests.subscribe)", null, cb),
  authrequestApprove: (id, addresses, ethChainId) =>
    messageService.sendMessage("pri(sites.requests.approve)", { id, addresses, ethChainId }),
  authrequestReject: (id) => messageService.sendMessage("pri(sites.requests.reject)", { id }),
  authrequestIgnore: (id) => messageService.sendMessage("pri(sites.requests.ignore)", { id }),

  // chain message types
  chains: () => messageService.sendMessage("pri(chains)"),
  chain: (id) => messageService.sendMessage("pri(chains.byid)", { id }),
  chainsSubscribe: (cb) => messageService.subscribe("pri(chains.subscribe)", null, cb),
  chainSubscribe: (id, cb) => messageService.subscribe("pri(chains.byid.subscribe)", { id }, cb),

  // token message types
  tokens: () => messageService.sendMessage("pri(tokens)"),
  token: (id) => messageService.sendMessage("pri(tokens.byid)", { id }),
  tokensSubscribe: (cb) => messageService.subscribe("pri(tokens.subscribe)", null, cb),
  tokenSubscribe: (id, cb) => messageService.subscribe("pri(tokens.byid.subscribe)", { id }, cb),

  // custom erc20 token management
  customErc20Tokens: () => messageService.sendMessage("pri(tokens.erc20.custom)"),
  customErc20Token: (id) => messageService.sendMessage("pri(tokens.erc20.custom.byid)", { id }),
  addCustomErc20Token: (token) => messageService.sendMessage("pri(tokens.erc20.custom.add)", token),
  removeCustomErc20Token: (id) =>
    messageService.sendMessage("pri(tokens.erc20.custom.remove)", { id }),
  clearCustomErc20Tokens: (filter) =>
    messageService.sendMessage("pri(tokens.erc20.custom.clear)", filter),

  // transaction message types
  transactionSubscribe: (id, cb) =>
    messageService.subscribe("pri(transactions.byid.subscribe)", { id }, cb),
  transactionsSubscribe: (cb) => messageService.subscribe("pri(transactions.subscribe)", null, cb),

  // asset transfer messages
  assetTransfer: (chainId, tokenId, fromAddress, toAddress, amount, tip, reapBalance) =>
    messageService.sendMessage("pri(assets.transfer)", {
      chainId,
      tokenId,
      fromAddress,
      toAddress,
      amount,
      tip,
      reapBalance,
    }),
  assetTransferCheckFees: (chainId, tokenId, fromAddress, toAddress, amount, tip, reapBalance) =>
    messageService.sendMessage("pri(assets.transfer.checkFees)", {
      chainId,
      tokenId,
      fromAddress,
      toAddress,
      amount,
      tip,
      reapBalance,
    }),
  assetTransferApproveSign: (id, signature) =>
    messageService.sendMessage("pri(assets.transfer.approveSign)", {
      id,
      signature,
    }),

  // eth related messages
  ethApproveSign: (id) =>
    messageService.sendMessage("pri(eth.signing.approveSign)", {
      id,
    }),
  ethApproveSignAndSend: (id, maxFeePerGas, maxPriorityFeePerGas) =>
    messageService.sendMessage("pri(eth.signing.approveSignAndSend)", {
      id,
      maxFeePerGas,
      maxPriorityFeePerGas,
    }),
  ethCancelSign: (id) =>
    messageService.sendMessage("pri(eth.signing.cancel)", {
      id,
    }),
  ethRequest: (request) => messageService.sendMessage("pri(eth.request)", request),
  ethNetworkAddGetRequests: () =>
    messageService.sendMessage("pri(eth.networks.add.requests)", null),
  ethNetworkAddApprove: (id) => messageService.sendMessage("pri(eth.networks.add.approve)", { id }),
  ethNetworkAddCancel: (id) => messageService.sendMessage("pri(eth.networks.add.cancel)", { id }),
  ethNetworkAddSubscribeRequests: (cb) =>
    messageService.subscribe("pri(eth.networks.add.subscribe)", null, cb),
  // ethereum network message types
  ethereumNetworks: () => messageService.sendMessage("pri(eth.networks)"),
  ethereumNetwork: (id) => messageService.sendMessage("pri(eth.networks.byid)", { id }),
  ethereumNetworksSubscribe: (cb) =>
    messageService.subscribe("pri(eth.networks.subscribe)", null, cb),
  ethereumNetworkSubscribe: (id, cb) =>
    messageService.subscribe("pri(eth.networks.byid.subscribe)", { id }, cb),
  addCustomEthereumNetwork: (ethereumNetwork: EthereumNetwork) =>
    messageService.sendMessage("pri(eth.networks.add.custom)", ethereumNetwork),
  removeCustomEthereumNetwork: (id: string) =>
    messageService.sendMessage("pri(eth.networks.removeCustomNetwork)", { id }),
  clearCustomEthereumNetworks: () =>
    messageService.sendMessage("pri(eth.networks.clearCustomNetworks)"),
  // ethereum watch assets
  ethWatchAssetRequestApprove: (id) =>
    messageService.sendMessage("pri(eth.watchasset.requests.approve)", { id }),
  ethWatchAssetRequestCancel: (id) =>
    messageService.sendMessage("pri(eth.watchasset.requests.cancel)", { id }),
  ethWatchAssetRequestsSubscribe: (cb) =>
    messageService.subscribe("pri(eth.watchasset.requests.subscribe)", null, cb),
}
