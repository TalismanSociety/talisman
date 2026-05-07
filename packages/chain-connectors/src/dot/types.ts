// biome-ignore lint/suspicious/noExplicitAny: matching upstream PJS ProviderInterface contract
export type ProviderInterfaceCallback = (error: Error | null, result: any) => void

// biome-ignore lint/suspicious/noExplicitAny: matching upstream PJS ProviderInterface contract
export type ProviderInterfaceEmitCb = (value?: any) => any

export interface ProviderInterface {
  readonly hasSubscriptions: boolean
  readonly isClonable: boolean
  readonly isConnected: boolean
  clone(): ProviderInterface
  connect(): Promise<void>
  disconnect(): Promise<void>
  on(type: "connected" | "disconnected" | "error", sub: ProviderInterfaceEmitCb): () => void
  // biome-ignore lint/suspicious/noExplicitAny: matching upstream PJS ProviderInterface contract
  send<T = any>(method: string, params: unknown[], isCacheable?: boolean): Promise<T>
  subscribe(
    type: string,
    method: string,
    params: unknown[],
    cb: ProviderInterfaceCallback
  ): Promise<number | string>
  unsubscribe(type: string, method: string, id: number | string): Promise<boolean>
}
