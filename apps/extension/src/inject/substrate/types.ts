import type {
  InjectedAccount,
  InjectedMetadataKnown,
  KeypairType,
  MetadataDefBase,
  MetadataDef as PjsMetadataDef,
} from "@core/types/pjsInterop"

import type { TalismanSigner as TalismanInjectedSigner } from "./Injected"

export type { InjectedAccount, InjectedMetadataKnown, MetadataDefBase }

// ---------------------------------------------------------------------------
// Structural copies of the page-side types from `@polkadot/extension-inject/types`
// (v0.63.1), kept byte-compatible so dapps see the exact same API surface.
// ---------------------------------------------------------------------------

export type Unsubcall = () => void

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

export type InjectOptions = InjectedExtensionInfo

export interface Web3AccountsOptions {
  accountType?: KeypairType[]
  extensions?: string[]
  genesisHash?: string | null
  ss58Format?: number
}

declare type This = typeof globalThis
/**
 * Same shape as polkadot-js. Talisman never stores or decodes with metadata a dapp provides — see
 * `InjectedMetadata.provide` — so there is no field here through which to supply runtime metadata.
 */
export type MetadataDef = PjsMetadataDef
export interface InjectedMetadata {
  get: () => Promise<InjectedMetadataKnown[]>
  provide: (definition: MetadataDef) => Promise<boolean>
}
export interface Injected {
  accounts: InjectedAccounts
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
