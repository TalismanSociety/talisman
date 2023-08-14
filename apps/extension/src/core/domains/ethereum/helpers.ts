import { ChainId } from "@core/domains/chains/types"
import {
  EthGasSettings,
  EthGasSettingsEip1559,
  EvmNetworkId,
  LedgerEthDerivationPathType,
} from "@core/domains/ethereum/types"
import { Token } from "@core/domains/tokens/types"
import { assert } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { erc20Abi } from "@talismn/balances-evm-erc20"
import { BigNumber, BigNumberish, ethers } from "ethers"
import * as yup from "yup"

const DERIVATION_PATHS_PATTERNS = {
  BIP44: "m/44'/60'/0'/0/INDEX",
  LedgerLive: "m/44'/60'/INDEX'/0/0",
  Legacy: "m/44'/60'/0'/INDEX",
}

const getDerivationPathFromPattern = (index = 0, pattern: string) =>
  pattern.replace("INDEX", index.toString())

// used a lot around the codebase, expects a slash at the start
export const getEthDerivationPath = (index = 0) =>
  `/${getDerivationPathFromPattern(index, DERIVATION_PATHS_PATTERNS.BIP44)}`

// used as arg when creating ledger account, expects no slash at the start
export const getEthLedgerDerivationPath = (type: LedgerEthDerivationPathType, index = 0) => {
  return getDerivationPathFromPattern(index, DERIVATION_PATHS_PATTERNS[type])
}

export const getEthTransferTransactionBase = async (
  evmNetworkId: EvmNetworkId,
  from: string,
  to: string,
  token: Token,
  planck: string
): Promise<ethers.providers.TransactionRequest> => {
  assert(evmNetworkId, "evmNetworkId is required")
  assert(token, "token is required")
  assert(planck, "planck is required")
  assert(isEthereumAddress(from), "from address is required")
  assert(isEthereumAddress(to), "to address is required")

  let tx: ethers.providers.TransactionRequest

  if (token.type === "evm-native") {
    tx = {
      value: ethers.BigNumber.from(planck),
      to: ethers.utils.getAddress(to),
    }
  } else if (token.type === "evm-erc20") {
    const contract = new ethers.Contract(token.contractAddress, erc20Abi)
    tx = await contract.populateTransaction["transfer"](to, ethers.BigNumber.from(planck))
  } else throw new Error(`Invalid token type ${token.type} - token ${token.id}`)

  return {
    chainId: parseInt(evmNetworkId, 10),
    from,
    ...tx,
  }
}

export const getErc20TokenId = (
  chainOrNetworkId: ChainId | EvmNetworkId,
  contractAddress: string
) => `${chainOrNetworkId}-evm-erc20-${contractAddress}`.toLowerCase()

const safeBigNumberish = (value?: BigNumberish) =>
  BigNumber.isBigNumber(value) ? value.toString() : value

export const serializeTransactionRequestBigNumbers = (
  transaction: ethers.providers.TransactionRequest
) => {
  const tx = { ...transaction }

  if (tx.gasLimit) tx.gasLimit = safeBigNumberish(tx.gasLimit)
  if (tx.gasPrice) tx.gasPrice = safeBigNumberish(tx.gasPrice)
  if (tx.maxFeePerGas) tx.maxFeePerGas = safeBigNumberish(tx.maxFeePerGas)
  if (tx.maxPriorityFeePerGas) tx.maxPriorityFeePerGas = safeBigNumberish(tx.maxPriorityFeePerGas)
  if (tx.value) tx.value = safeBigNumberish(tx.value)
  if (tx.nonce) tx.nonce = safeBigNumberish(tx.nonce)

  return tx
}

// BigNumbers need to be reconstructed if they are serialized then deserialized
export const rebuildTransactionRequestNumbers = (
  transaction: ethers.providers.TransactionRequest
) => {
  const tx = structuredClone(transaction)

  if (tx.gasLimit) tx.gasLimit = BigNumber.from(tx.gasLimit)
  if (tx.gasPrice) tx.gasPrice = BigNumber.from(tx.gasPrice)
  if (tx.maxFeePerGas) tx.maxFeePerGas = BigNumber.from(tx.maxFeePerGas)
  if (tx.maxPriorityFeePerGas) tx.maxPriorityFeePerGas = BigNumber.from(tx.maxPriorityFeePerGas)
  if (tx.value) tx.value = BigNumber.from(tx.value)
  if (tx.nonce) tx.nonce = BigNumber.from(tx.nonce)

  return tx
}

export const rebuildGasSettings = (gasSettings: EthGasSettings) => {
  const gs = structuredClone(gasSettings)

  gs.gasLimit = BigNumber.from(gs.gasLimit)

  if (gs.type === 2) {
    gs.maxFeePerGas = BigNumber.from(gs.maxFeePerGas)
    gs.maxPriorityFeePerGas = BigNumber.from(gs.maxPriorityFeePerGas)
  } else if (gs.type === 0) {
    gs.gasPrice = BigNumber.from(gs.gasPrice)
  } else throw new Error("Unexpected gas settings type")

  return gs
}

const TX_GAS_LIMIT_DEFAULT = BigNumber.from("250000")
const TX_GAS_LIMIT_MIN = BigNumber.from("21000")

export const getGasLimit = (
  blockGasLimit: BigNumberish,
  estimatedGas: BigNumberish,
  tx?: ethers.providers.TransactionRequest
) => {
  // some dapps use legacy gas field instead of gasLimit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestedGasLimit = tx?.gasLimit ?? (tx as any)?.gas

  const bnSuggestedGasLimit = suggestedGasLimit
    ? BigNumber.from(suggestedGasLimit)
    : BigNumber.from(0)
  const bnEstimatedGas = BigNumber.from(estimatedGas)
  // RPC estimated gas may be too low (reliable ex: https://portal.zksync.io/bridge),
  // so if dapp suggests higher gas limit as the estimate, use that
  const highestLimit = bnEstimatedGas.gt(bnSuggestedGasLimit) ? bnEstimatedGas : bnSuggestedGasLimit

  let gasLimit = BigNumber.from(highestLimit)
  if (gasLimit.gt(blockGasLimit)) {
    // probably bad formatting or error from the dapp, fallback to default value
    gasLimit = TX_GAS_LIMIT_DEFAULT
  } else if (gasLimit.lt(TX_GAS_LIMIT_MIN)) {
    // invalid, all chains use 21000 as minimum, fallback to default value
    gasLimit = TX_GAS_LIMIT_DEFAULT
  }

  return gasLimit
}

// Assume this value is the same for all EVM chains, isn't it ?
const FEE_MAX_RAISE_RATIO_PER_BLOCK = 0.125

export const getMaxFeePerGas = (
  baseFeePerGas: BigNumberish,
  maxPriorityFeePerGas: BigNumberish,
  maxBlocksWait = 8,
  increase = true
) => {
  let base = BigNumber.from(baseFeePerGas)

  //baseFeePerGas can augment 12.5% per block
  for (let i = 0; i < maxBlocksWait; i++)
    base = base.mul((1 + (increase ? 1 : -1) * FEE_MAX_RAISE_RATIO_PER_BLOCK) * 1000).div(1000)

  return base.add(maxPriorityFeePerGas)
}

export const getGasSettingsEip1559 = (
  baseFee: BigNumber,
  maxPriorityFeePerGas: BigNumber,
  gasLimit: BigNumber,
  maxBlocksWait?: number
): EthGasSettingsEip1559 => ({
  type: 2,
  maxPriorityFeePerGas,
  maxFeePerGas: getMaxFeePerGas(baseFee, maxPriorityFeePerGas, maxBlocksWait),
  gasLimit,
})

export const getTotalFeesFromGasSettings = (
  gasSettings: EthGasSettings,
  estimatedGas: BigNumberish,
  baseFeePerGas?: BigNumberish | null
) => {
  if (gasSettings.type === 2) {
    if (baseFeePerGas === undefined)
      throw new Error("baseFeePerGas argument is required for type 2 fee computation")
    return {
      estimatedFee: BigNumber.from(
        BigNumber.from(baseFeePerGas).lt(gasSettings.maxFeePerGas)
          ? baseFeePerGas
          : gasSettings.maxFeePerGas
      )
        .add(gasSettings.maxPriorityFeePerGas)
        .mul(
          BigNumber.from(estimatedGas).lt(gasSettings.gasLimit)
            ? estimatedGas
            : gasSettings.gasLimit
        ),
      maxFee: BigNumber.from(gasSettings.maxFeePerGas)
        .add(gasSettings.maxPriorityFeePerGas)
        .mul(gasSettings.gasLimit),
    }
  } else {
    return {
      estimatedFee: BigNumber.from(gasSettings.gasPrice).mul(
        BigNumber.from(estimatedGas).lt(gasSettings.gasLimit) ? estimatedGas : gasSettings.gasLimit
      ),
      maxFee: BigNumber.from(gasSettings.gasPrice).mul(gasSettings.gasLimit),
    }
  }
}

export const prepareTransaction = (
  tx: ethers.providers.TransactionRequest,
  gasSettings: EthGasSettings,
  nonce: number
) => {
  // keep only known fields except gas related ones, there are sometimes invalid ones in the original payload (ex: "gas")
  const {
    chainId,
    data,
    from,
    to,
    value = BigNumber.from(0),
    accessList,
    ccipReadEnabled,
    customData,
  } = tx

  const transaction: ethers.providers.TransactionRequest = {
    chainId,
    from,
    to,
    value,
    nonce: BigNumber.from(nonce),
    data,
    ...gasSettings,
  }
  if (accessList) transaction.accessList = accessList
  if (customData) transaction.customData = customData
  if (ccipReadEnabled !== undefined) transaction.ccipReadEnabled = ccipReadEnabled

  return transaction
}

const testNoScriptTag = (text?: string) => !text?.toLowerCase().includes("<script")

const schemaAddEthereumRequest = yup.object().shape({
  chainId: yup.string().required(),
  chainName: yup.string().required().max(100).test("noScriptTag", testNoScriptTag),
  nativeCurrency: yup
    .object()
    .shape({
      name: yup.string().required().max(50).test("noScriptTag", testNoScriptTag),
      symbol: yup.string().required().min(2).max(11).test("noScriptTag", testNoScriptTag),
      decimals: yup.number().required().integer(),
    })
    .required(),
  rpcUrls: yup.array().of(yup.string().required().url()).required(),
  blockExplorerUrls: yup.array().of(yup.string().required().url()),
  iconUrls: yup.array().of(yup.string()),
})

export const isValidAddEthereumRequestParam = (obj: unknown) =>
  schemaAddEthereumRequest.isValidSync(obj)

// Function used to check url for token & network icons, when provided by dapps
// It is recommended to sanitize the URI by whitelisting specific schemes, ports and file extensions.
// For example, only the HTTPS protocol scheme should be used.
// Furthermore, private IP ranges and hostnames should be forbidden.
// Finally, only specific whitelisted image extensions should be allowed.
export const isSafeImageUrl = (url?: string) => {
  if (!url) return true
  try {
    const urlObj = new URL(url)
    if (urlObj.protocol !== "https:") return false
    if (urlObj.port) return false
    if (urlObj.hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) return false
    if (urlObj.hostname.match(/^(localhost|127\.0\.0\.1)$/)) return false
    if (!urlObj.pathname.match(/\.(jpeg|jpg|gif|png|svg|webp)$/)) return false
    return true
  } catch (e) {
    return false
  }
}

const schemaWatchAssetRequest = yup.object().shape({
  type: yup.string().oneOf(["ERC20"]).required(),
  options: yup
    .object()
    .shape({
      address: yup.string().required().test("ethAddress", isEthereumAddress),
      symbol: yup.string().min(2).max(11).test("noScriptTag", testNoScriptTag),
      decimals: yup.number(),
      // ignore image if it doesn't pass security checks
      image: yup.string().transform((value) => (isSafeImageUrl(value) ? value : undefined)),
    })
    .required(),
})

export const isValidWatchAssetRequestParam = (obj: unknown) =>
  schemaWatchAssetRequest.isValidSync(obj)

export const sanitizeWatchAssetRequestParam = (obj: unknown) =>
  schemaWatchAssetRequest.validate(obj)

// for now, only allow eth_accounts property with an empty object
const schemaRequestedPermissions = yup
  .object()
  .required()
  .shape({
    eth_accounts: yup.object().required().shape({}).noUnknown(),
  })
  .noUnknown()

export const isValidRequestedPermissions = (obj: unknown) =>
  schemaRequestedPermissions.isValidSync(obj)
