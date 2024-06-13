export declare type Port = chrome.runtime.Port

export declare type RequestIdOnly = {
  id: string
}

// Have to replicate these utils here because polkadot does not export them
export declare type IsNull<T, K extends keyof T> = {
  [K1 in Exclude<keyof T, K>]: T[K1]
} & T[K] extends null
  ? K
  : never

export declare type NullKeys<T> = {
  [K in keyof T]: IsNull<T, K>
}[keyof T]

export declare type KeysWithDefinedValues<T> = {
  [K in keyof T]: T[K] extends undefined ? never : K
}[keyof T]

export declare type NoUndefinedValues<T> = {
  [K in KeysWithDefinedValues<T>]: T[K]
}

export declare type KeysWithIdOnlyValues<T> = {
  [K in keyof T]: T[K] extends RequestIdOnly ? K : never
}[keyof T]

export declare type IdOnlyValues<T> = {
  [K in KeysWithIdOnlyValues<T>]: T[K]
}

export interface BaseRequest<T extends string> {
  type: T
  id: BaseRequestId<T>
}

export type BaseRequestId<T extends string> = `${T}.${string}`
export interface Resolver<T> {
  reject: (error: Error) => void
  resolve: (result: T) => void
}

export type Address = string

// Addresses is a record where the keys are the address itself, and the values are an array of chain genesis hashes, or null if the address may have
// balances on any chain
export type Addresses = Record<Address, Array<string> | null>
export type AddressesByChain = { [chainId: string]: Address[] }
export type AddressList = Address[]
