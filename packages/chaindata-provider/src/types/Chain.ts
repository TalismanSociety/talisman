import { EvmNetworkId } from "./EvmNetwork"
import { TokenId } from "./Token"

export type ChainList = Record<ChainId, Chain>

export type ChainId = string
export type Chain = {
  id: ChainId // The ID of this chain
  isTestnet: boolean // Is this chain a testnet?
  isDefault: boolean // Is this chain enabled by default?
  sortIndex: number | null // The sortIndex of this chain
  genesisHash: `0x${string}` | null // The genesisHash of this chain
  prefix: number | null // The substrate prefix of this chain
  name: string | null // The name of this chain
  themeColor: string | null // The theme color for this chain
  logo: string | null // A url to the logo of this chain
  chainName: string | null // The `system_chain` on-chain name of this chain
  chainType: "Development" | "Local" | "Live" | { Custom: string } | string | null // The `system_chainType` on-chain type of this chain
  implName: string | null // The implementation name of this chain
  specName: string | null // The spec name of this chain
  specVersion: string | null // The spec version of this chain
  nativeToken: { id: TokenId } | null // The nativeToken of this chain
  tokens: Array<{ id: TokenId }> | null // The ORML tokens for this chain
  account: string | null // The account address format of this chain
  subscanUrl: string | null // The subscan endpoint of this chain
  chainspecQrUrl: string | null // A url to a qr code with the chainspec for this chain
  latestMetadataQrUrl: string | null // A url to a qr code with the latest metadata for this chain
  isUnknownFeeToken: boolean // Indicates if chain may use a different fee token than it's native token
  feeToken: string | null
  rpcs: Array<SubstrateRpc> | null // Some public RPCs for connecting to this chain's network
  evmNetworks: Array<{ id: EvmNetworkId }>

  parathreads: Array<Pick<Chain, "id" | "paraId" | "name">> | null // The parathreads of this relayChain, if some exist

  paraId: number | null // The paraId of this chain, if it is a parachain
  relay: Pick<Chain, "id"> | null // The parent relayChain of this parachain, if this chain is a parachain

  balancesConfig: Array<BalancesConfig>
  // TODO: Delete (has its own store now)
  /** @deprecated has its own store now */
  balancesMetadata: Array<BalancesMetadata>

  /** Indicates if the chain has the `CheckMetadataHash` extension, enabling signing with the ledger generic app */
  hasCheckMetadataHash?: boolean
  /**
   * Some chains require a 1-byte prefix on transaction signatures to indicate the signing algo used:
   *
   * - Ed25519:  `0x00`
   * - Sr25519:  `0x01`
   * - Ecdsa:    `0x02`
   * - Ethereum: `0x03`
   *
   * Polkadot.js tries to auto-detect whether to add this prefix or not,
   * as part of the `GenericExtrinsicPayload.sign` method:
   * - https://github.com/polkadot-js/api/blob/778d79a/packages/types/src/extrinsic/v4/ExtrinsicPayload.ts#L37-L39
   * - https://github.com/polkadot-js/api/blob/778d79a/packages/types/src/extrinsic/v4/ExtrinsicPayload.ts#L122-L129
   *
   * However, on some chains this auto-detection results in either a false-positive or false-negative.
   *
   * By leveraging the generic extrinsic sign function from `@polkadot/types/extrinsic/util`:
   * - https://github.com/polkadot-js/api/blob/778d79a/packages/types/src/extrinsic/util.ts#L9-L15
   *
   * We can specify whether or not to include the signature prefix, based on the value of this `hasExtrinsicSignatureTypePrefix` property.
   */
  hasExtrinsicSignatureTypePrefix?: boolean

  /** Custom types to be registered in the TypeRegistry */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signedExtensions?: any

  /** Custom signed extensions to be registered in the Metadata object */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registryTypes?: any

  staking?: Array<StakingConfig>
}
export type CustomChain = Chain & {
  isCustom: true
}

export type SubstrateRpc = {
  url: string // The url of this RPC
}

export type BalancesConfig = { moduleType: string; moduleConfig: unknown }
export type BalancesMetadata = { moduleType: string; metadata: unknown }

export type NomPoolStakingConfig = {
  type: "nominationPools"
  minJoinBond: string
  recommendedPoolIds: number[]
  // era info ?
}
export type StakingConfig = NomPoolStakingConfig // TODO: | DappStaking | ValidatorStaking
