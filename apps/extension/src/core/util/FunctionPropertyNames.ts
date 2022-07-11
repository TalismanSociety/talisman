/* eslint-disable @typescript-eslint/ban-types */
// Some handy types from https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types

export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never
}[keyof T]
export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>

export type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]
export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>
