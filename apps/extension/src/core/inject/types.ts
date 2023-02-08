import type {
  InjectOptions,
  InjectedAccount,
  InjectedAccountWithMeta,
  InjectedAccounts,
  InjectedExtensionInfo,
  InjectedMetadataKnown,
  InjectedProvider,
  InjectedProviderWithMeta,
  MetadataDefBase,
  Injected as PjsInjected,
  MetadataDef as PjsMetadataDef,
  ProviderList,
  ProviderMeta,
  Unsubcall,
  Web3AccountsOptions,
} from "@polkadot/extension-inject/types"

import type { TalismanSigner as TalismanInjectedSigner } from "./Injected"

export type {
  InjectOptions,
  InjectedAccount,
  InjectedAccountWithMeta,
  InjectedAccounts,
  InjectedExtensionInfo,
  InjectedMetadataKnown,
  InjectedProvider,
  InjectedProviderWithMeta,
  MetadataDefBase,
  ProviderList,
  ProviderMeta,
  Unsubcall,
  Web3AccountsOptions,
}

declare type This = typeof globalThis
export interface MetadataDef extends PjsMetadataDef {
  metadataRpc?: string
}
export interface InjectedMetadata {
  get: () => Promise<InjectedMetadataKnown[]>
  provide: (definition: MetadataDef) => Promise<boolean>
}
export interface Injected extends PjsInjected {
  metadata?: InjectedMetadata
  signer: TalismanInjectedSigner
}
export interface InjectedWindowProvider {
  enable: (origin: string) => Promise<Injected>
  version: string
}
export interface InjectedWindow extends This {
  injectedWeb3: Record<string, InjectedWindowProvider>
}
export type InjectedExtension = InjectedExtensionInfo & Injected
