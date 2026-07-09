import type {
  InjectedAccount,
  InjectedMetadataKnown,
  KeypairType,
  MetadataDefBase,
  MetadataDef as PjsMetadataDef,
  ProviderList,
  ProviderMeta,
} from "@core/types/pjsInterop"

import type { TalismanSigner as TalismanInjectedSigner } from "./Injected"

export type { InjectedAccount, InjectedMetadataKnown, MetadataDefBase, ProviderList, ProviderMeta }

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

// structural equivalents of the `@polkadot/rpc-provider/types` provider types,
// only referenced by `InjectedProvider` below (Talisman never exposes a provider:
// the background constructs RpcState with no providers)
// biome-ignore lint/suspicious/noExplicitAny: legacy, matches upstream
type ProviderInterfaceCallback = (error: Error | null, result: any) => void
type ProviderInterfaceEmitted = "connected" | "disconnected" | "error"
// biome-ignore lint/suspicious/noExplicitAny: legacy, matches upstream
type ProviderInterfaceEmitCb = (value?: any) => any
interface EndpointStats {
  bytesRecv: number
  bytesSent: number
  cached: number
  errors: number
  requests: number
  subscriptions: number
  timeout: number
}
interface ProviderStats {
  active: {
    requests: number
    subscriptions: number
  }
  total: EndpointStats
}
interface ProviderInterface {
  readonly hasSubscriptions: boolean
  readonly isClonable: boolean
  readonly isConnected: boolean
  readonly stats?: ProviderStats
  readonly ttl?: number | null
  clone(): ProviderInterface
  connect(): Promise<void>
  disconnect(): Promise<void>
  on(type: ProviderInterfaceEmitted, sub: ProviderInterfaceEmitCb): () => void
  // biome-ignore lint/suspicious/noExplicitAny: legacy, matches upstream
  send<T = any>(method: string, params: unknown[], isCacheable?: boolean): Promise<T>
  subscribe(
    type: string,
    method: string,
    params: unknown[],
    cb: ProviderInterfaceCallback
  ): Promise<number | string>
  unsubscribe(type: string, method: string, id: number | string): Promise<boolean>
}

export interface InjectedProvider extends ProviderInterface {
  listProviders: () => Promise<ProviderList>
  startProvider: (key: string) => Promise<ProviderMeta>
}

export interface InjectedProviderWithMeta {
  provider: InjectedProvider
  meta: ProviderMeta
}

declare type This = typeof globalThis
export interface MetadataDef extends PjsMetadataDef {
  metadataRpc?: `0x${string}`
}
export interface InjectedMetadata {
  get: () => Promise<InjectedMetadataKnown[]>
  provide: (definition: MetadataDef) => Promise<boolean>
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
