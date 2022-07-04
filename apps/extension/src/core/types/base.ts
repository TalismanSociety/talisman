import { Runtime } from "webextension-polyfill"
export declare type Port = chrome.runtime.Port | Runtime.Port

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

export interface Resolver<T> {
  reject: (error: Error) => void
  resolve: (result: T) => void
}
