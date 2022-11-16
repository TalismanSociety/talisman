import type { ProviderInterface } from "@polkadot/rpc-provider/types"
import type { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import type { KeypairType } from "@polkadot/util-crypto/types"

import type { TalismanSigner as TalismanInjectedSigner } from "./Injected"

declare type This = typeof globalThis
export declare type Unsubcall = () => void
export interface InjectedAccount {
  address: string
  genesisHash?: string | null
  name?: string
  type?: KeypairType
}
export interface InjectedAccountWithMeta {
  address: string
  meta: {
    genesisHash?: string | null
    name?: string
    source: string
  }
  type?: KeypairType
}
export interface InjectedAccounts {
  get: (anyType?: boolean) => Promise<InjectedAccount[]>
  subscribe: (cb: (accounts: InjectedAccount[]) => void | Promise<void>) => Unsubcall
}
export interface InjectedExtensionInfo {
  name: string
  version: string
}
export interface ProviderMeta {
  network: string
  node: "full" | "light"
  source: string
  transport: string
}
export interface MetadataDefBase {
  chain: string
  genesisHash: string
  icon: string
  ss58Format: number
  chainType?: "substrate" | "ethereum"
}
export interface MetadataDef extends MetadataDefBase {
  color?: string
  specVersion: number
  tokenDecimals: number
  tokenSymbol: string
  types: Record<string, Record<string, string> | string>
  metaCalls?: string
  metadataRpc?: string
  userExtensions?: ExtDef
}
export interface InjectedMetadataKnown {
  genesisHash: string
  specVersion: number
}
export interface InjectedMetadata {
  get: () => Promise<InjectedMetadataKnown[]>
  provide: (definition: MetadataDef) => Promise<boolean>
}
export declare type ProviderList = Record<string, ProviderMeta>
export interface InjectedProvider extends ProviderInterface {
  listProviders: () => Promise<ProviderList>
  startProvider: (key: string) => Promise<ProviderMeta>
}
export interface InjectedProviderWithMeta {
  provider: InjectedProvider
  meta: ProviderMeta
}
export interface Injected {
  accounts: InjectedAccounts
  metadata?: InjectedMetadata
  provider?: InjectedProvider
  signer: TalismanInjectedSigner
}
export interface InjectedWindowProvider {
  enable: (origin: string) => Promise<Injected>
  version: string
}
export interface InjectedWindow extends This {
  injectedWeb3: Record<string, InjectedWindowProvider>
}
export declare type InjectedExtension = InjectedExtensionInfo & Injected
export declare type InjectOptions = InjectedExtensionInfo
export interface Web3AccountsOptions {
  ss58Format?: number
  accountType?: KeypairType[]
}
export {}
