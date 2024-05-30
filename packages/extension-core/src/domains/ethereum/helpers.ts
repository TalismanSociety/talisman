import { assert } from "@polkadot/util"
import { erc20Abi } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { isBigInt, isEthereumAddress } from "@talismn/util"
import {
  Hex,
  TransactionRequest,
  TransactionRequestBase,
  TransactionSerializable,
  TransactionSerializableEIP1559,
  TransactionSerializableEIP2930,
  TransactionSerializableLegacy,
  encodeFunctionData,
  getAddress,
  hexToBigInt,
  hexToNumber,
  isAddress,
  isHex,
} from "viem"
import * as yup from "yup"

import {
  EthGasSettings,
  EthGasSettingsEip1559,
  EvmAddress,
  EvmNetworkId,
  LedgerEthDerivationPathType,
} from "./types"

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
  from: EvmAddress,
  to: EvmAddress,
  token: Token,
  planck: bigint
) => {
  assert(evmNetworkId, "evmNetworkId is required")
  assert(token, "token is required")
  assert(isBigInt(planck), "planck is required")
  assert(isAddress(from), "from address is required")
  assert(isAddress(to), "to address is required")

  if (token.type === "evm-native") {
    return {
      from,
      value: planck,
      to: getAddress(to),
    }
  }

  if (token.type === "evm-erc20" || token.type === "evm-uniswapv2") {
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [to, planck],
    })

    return {
      from,
      to: getAddress(token.contractAddress),
      data,
    }
  }

  throw new Error(`Invalid token type ${token.type} - token ${token.id}`)
}

export const serializeTransactionRequest = (
  tx: TransactionRequest<bigint | string>
): TransactionRequest<string> => {
  if (tx.type === "eip4844") throw new Error("Unsupported transaction type")

  const serialized: TransactionRequest<string> = { from: tx.from }

  if (tx.to !== undefined) serialized.to = tx.to
  if (tx.data !== undefined) serialized.data = tx.data
  if (tx.accessList !== undefined) serialized.accessList = tx.accessList
  if (tx.type !== undefined) serialized.type = tx.type
  if (tx.nonce !== undefined) serialized.nonce = tx.nonce

  // bigint fields need to be serialized
  if (tx.value !== undefined) serialized.value = tx.value.toString()
  if (tx.gas !== undefined) serialized.gas = tx.gas.toString()
  if (tx.gasPrice !== undefined) serialized.gasPrice = tx.gasPrice.toString()
  if (tx.maxFeePerGas !== undefined) serialized.maxFeePerGas = tx.maxFeePerGas.toString()
  if (tx.maxPriorityFeePerGas !== undefined)
    serialized.maxPriorityFeePerGas = tx.maxPriorityFeePerGas.toString()

  return serialized
}

export const serializeTransactionRequestBase = (
  txb: TransactionRequestBase
): TransactionRequestBase<string> => {
  const serialized: TransactionRequestBase<string> = {
    from: txb.from,
  }

  if (txb.data !== undefined) serialized.data = txb.data
  if (txb.to !== undefined) serialized.to = txb.to
  if (txb.value !== undefined) serialized.value = txb.value.toString()
  if (txb.gas !== undefined) serialized.gas = txb.gas.toString()
  if (txb.nonce !== undefined) serialized.nonce = txb.nonce

  return serialized
}

export const parseGasSettings = (gasSettings: EthGasSettings<string>): EthGasSettings<bigint> => {
  return gasSettings.type === "eip1559"
    ? {
        type: "eip1559",
        gas: BigInt(gasSettings.gas),
        maxFeePerGas: BigInt(gasSettings.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(gasSettings.maxPriorityFeePerGas),
      }
    : {
        type: gasSettings.type,
        gas: BigInt(gasSettings.gas),
        gasPrice: BigInt(gasSettings.gasPrice),
      }
}

export const serializeGasSettings = (
  gasSettings: EthGasSettings<bigint>
): EthGasSettings<string> => {
  return gasSettings.type === "eip1559"
    ? {
        type: "eip1559",
        gas: gasSettings.gas.toString(),
        maxFeePerGas: gasSettings.maxFeePerGas.toString(),
        maxPriorityFeePerGas: gasSettings.maxPriorityFeePerGas.toString(),
      }
    : {
        type: gasSettings.type,
        gas: gasSettings.gas.toString(),
        gasPrice: gasSettings.gasPrice.toString(),
      }
}

// BigNumbers need to be reconstructed if they are serialized then deserialized
export const parseTransactionRequest = (
  tx: TransactionRequest<string>
): TransactionRequest<bigint> => {
  if (tx.type === "eip4844") throw new Error("Unsupported transaction type")

  const parsed: TransactionRequest<bigint> = { from: tx.from }

  if (tx.to !== undefined) parsed.to = tx.to
  if (tx.data !== undefined) parsed.data = tx.data
  if (tx.accessList !== undefined) parsed.accessList = tx.accessList
  if (tx.type !== undefined) parsed.type = tx.type
  if (tx.nonce !== undefined) parsed.nonce = tx.nonce

  // bigint fields need to be parsed
  if (typeof tx.value === "string") parsed.value = BigInt(tx.value)
  if (typeof tx.gas === "string") parsed.gas = BigInt(tx.gas)
  if (typeof tx.gasPrice === "string") parsed.gasPrice = BigInt(tx.gasPrice)
  if (typeof tx.maxFeePerGas === "string") parsed.maxFeePerGas = BigInt(tx.maxFeePerGas)
  if (typeof tx.maxPriorityFeePerGas === "string")
    parsed.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas)

  return parsed
}

export const parseRpcTransactionRequestBase = (
  rtx: TransactionRequestBase<Hex, Hex>
): TransactionRequestBase => {
  const txBase: TransactionRequestBase = { from: rtx.from }

  if (isHex(rtx.to)) txBase.to = rtx.to
  if (isHex(rtx.data)) txBase.data = rtx.data
  if (isHex(rtx.value)) txBase.value = hexToBigInt(rtx.value)
  if (isHex(rtx.gas)) txBase.gas = hexToBigInt(rtx.gas)
  if (isHex(rtx.nonce)) txBase.nonce = hexToNumber(rtx.nonce)

  return txBase
}

export const getTransactionSerializable = (
  txRequest: TransactionRequest,
  chainId: number
): TransactionSerializable => {
  switch (txRequest.type) {
    case "eip1559": {
      const res: TransactionSerializableEIP1559 = {
        chainId,
        type: "eip1559",
        data: txRequest.data,
        gas: txRequest.gas,
        maxFeePerGas: txRequest.maxFeePerGas,
        maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas,
        nonce: txRequest.nonce,
        to: txRequest.to,
        value: txRequest.value,
        accessList: txRequest.accessList,
      }
      return res
    }
    case "legacy": {
      const res: TransactionSerializableLegacy = {
        chainId,
        type: "legacy",
        data: txRequest.data,
        gas: txRequest.gas,
        gasPrice: txRequest.gasPrice,
        nonce: txRequest.nonce,
        to: txRequest.to,
        value: txRequest.value,
        accessList: txRequest.accessList,
      }
      return res
    }
    case "eip2930": {
      const res: TransactionSerializableEIP2930 = {
        chainId,
        type: "eip2930",
        data: txRequest.data,
        gas: txRequest.gas,
        gasPrice: txRequest.gasPrice,
        nonce: txRequest.nonce,
        to: txRequest.to,
        value: txRequest.value,
      }
      return res
    }

    default:
      throw new Error("Unsupported transaction type")
  }
}

const TX_GAS_LIMIT_DEFAULT = 250000n
const TX_GAS_LIMIT_MIN = 21000n
const TX_GAS_LIMIT_SAFETY_RATIO = 2n

export const getGasLimit = (
  blockGasLimit: bigint,
  estimatedGas: bigint,
  tx: TransactionRequestBase | undefined,
  isContractCall?: boolean
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestedGasLimit = tx?.gas ?? 0n
  // for contract calls, gas cost can evolve overtime : add a safety margin
  const safeGasLimit = isContractCall
    ? (estimatedGas * (100n + TX_GAS_LIMIT_SAFETY_RATIO)) / 100n
    : estimatedGas
  // RPC estimated gas may be too low (reliable ex: https://portal.zksync.io/bridge),
  // so if dapp suggests higher gas limit as the estimate, use that
  const highestLimit = safeGasLimit > suggestedGasLimit ? safeGasLimit : suggestedGasLimit

  let gasLimit = highestLimit
  if (gasLimit > blockGasLimit) {
    // probably bad formatting or error from the dapp, fallback to default value
    gasLimit = TX_GAS_LIMIT_DEFAULT
  } else if (gasLimit < TX_GAS_LIMIT_MIN) {
    // invalid, all chains use 21000 as minimum, fallback to default value
    gasLimit = TX_GAS_LIMIT_DEFAULT
  }

  return gasLimit
}

// Assume this value is the same for all EVM chains, isn't it ?
const FEE_MAX_RAISE_RATIO_PER_BLOCK = 0.125

export const getMaxFeePerGas = (
  baseFeePerGas: bigint,
  maxPriorityFeePerGas: bigint,
  maxBlocksWait = 8,
  increase = true
) => {
  let base = baseFeePerGas

  //baseFeePerGas can augment 12.5% per block
  for (let i = 0; i < maxBlocksWait; i++)
    base = (base * BigInt((1 + (increase ? 1 : -1) * FEE_MAX_RAISE_RATIO_PER_BLOCK) * 1000)) / 1000n

  return base + maxPriorityFeePerGas
}

export const getGasSettingsEip1559 = (
  baseFee: bigint,
  maxPriorityFeePerGas: bigint,
  gas: bigint,
  maxBlocksWait?: number
): EthGasSettingsEip1559 => ({
  type: "eip1559",
  maxPriorityFeePerGas,
  maxFeePerGas: getMaxFeePerGas(baseFee, maxPriorityFeePerGas, maxBlocksWait),
  gas,
})

export const getTotalFeesFromGasSettings = (
  gasSettings: EthGasSettings,
  estimatedGas: bigint,
  baseFeePerGas: bigint | null | undefined,
  l1Fee: bigint
) => {
  // L1 fee needs to be included in estimatedFee and maxFee to keep the same UX behavior whether or not the chain is a L2
  const estimatedL1DataFee = l1Fee > 0n ? l1Fee : null

  // OP Stack docs : Spikes in Ethereum gas prices may result in users paying a higher or lower than estimated L1 data fee, by up to 25%
  // https://community.optimism.io/docs/developers/build/transaction-fees/#the-l1-data-fee
  const maxL1Fee = (l1Fee * 125n) / 100n

  if (gasSettings.type === "eip1559") {
    if (!isBigInt(baseFeePerGas))
      throw new Error("baseFeePerGas argument is required for type 2 fee computation")
    return {
      estimatedL1DataFee,
      estimatedFee:
        (gasSettings.maxPriorityFeePerGas +
          (baseFeePerGas < gasSettings.maxFeePerGas ? baseFeePerGas : gasSettings.maxFeePerGas)) *
          (estimatedGas < gasSettings.gas ? estimatedGas : gasSettings.gas) +
        l1Fee,
      maxFee:
        (gasSettings.maxFeePerGas + gasSettings.maxPriorityFeePerGas) * gasSettings.gas + maxL1Fee,
    }
  } else {
    return {
      estimatedL1DataFee,
      estimatedFee:
        gasSettings.gasPrice * (estimatedGas < gasSettings.gas ? estimatedGas : gasSettings.gas) +
        l1Fee,
      maxFee: gasSettings.gasPrice * gasSettings.gas + maxL1Fee,
    }
  }
}

export const getMaxTransactionCost = (transaction: TransactionRequest) => {
  if (transaction.gas === undefined) throw new Error("gasLimit is required for fee computation")

  const value = transaction.value ?? 0n

  if (transaction.type === "eip1559") {
    if (transaction.maxFeePerGas === undefined)
      throw new Error("maxFeePerGas is required for type 2 fee computation")
    return transaction.maxFeePerGas * transaction.gas + value
  } else {
    if (transaction.gasPrice === undefined)
      throw new Error("gasPrice is required for legacy fee computation")
    return transaction.gasPrice * transaction.gas + value
  }
}

export const prepareTransaction = (
  txBase: TransactionRequestBase,
  gasSettings: EthGasSettings,
  nonce: number
): TransactionRequest => ({
  ...txBase,
  ...gasSettings,
  nonce,
})

const testNoScriptTag = (text?: string) => !text?.toLowerCase().includes("<script")

const schemaAddEthereumRequest = yup.object().shape({
  chainId: yup.string().required().test("noScriptTag", testNoScriptTag),
  chainName: yup.string().required().max(100).test("noScriptTag", testNoScriptTag),
  nativeCurrency: yup
    .object()
    .shape({
      name: yup.string().required().max(50).test("noScriptTag", testNoScriptTag),
      symbol: yup.string().required().min(2).max(11).test("noScriptTag", testNoScriptTag),
      decimals: yup.number().required().integer(),
    })
    .required(),
  rpcUrls: yup.array().of(yup.string().required().test("noScriptTag", testNoScriptTag)).required(),
  blockExplorerUrls: yup
    .array()
    .of(yup.string().required().test("noScriptTag", testNoScriptTag))
    .nullable(),
  iconUrls: yup.array().of(yup.string().test("noScriptTag", testNoScriptTag)),
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

// Acala EVM+ requires specific gas management
// https://evmdocs.acala.network/network/gas-parameters
export const isAcalaEvmPlus = (evmNetworkId: EvmNetworkId) => {
  return [
    "787", // Acala
    "595", // Mandala testnet
  ].includes(evmNetworkId)
}
