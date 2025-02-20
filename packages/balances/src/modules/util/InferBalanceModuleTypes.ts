import { BalanceModule, NewBalanceModule } from "../../BalanceModule"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBalanceModule = BalanceModule<any, any, any, any, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyNewBalanceModule = NewBalanceModule<any, any, any, any, any>

/**
 * The following `Infer*` collection of generic types can be used when you want to
 * extract one of the generic type arguments from an existing BalanceModule.
 *
 * For example, you might want to write a function which can accept any BalanceModule
 * as an input, and then return the specific TokenType for that module:
 * function getTokens<T extends AnyBalanceModule>(module: T): InferTokenType<T>
 *
 * Or for another example, you might want a function which can take any BalanceModule `type`
 * string as input, and then return some data associated with that module with the correct type:
 * function getChainMeta<T extends AnyBalanceModule>(type: InferModuleType<T>): InferChainMeta<T> | undefined
 */
type InferBalanceModuleTypes<T extends AnyNewBalanceModule> =
  T extends NewBalanceModule<
    infer TModuleType,
    infer TTokenType,
    infer TChainMeta,
    infer TModuleConfig,
    infer TTransferParams
  >
    ? {
        TModuleType: TModuleType
        TTokenType: TTokenType
        TChainMeta: TChainMeta
        TModuleConfig: TModuleConfig
        TTransferParams: TTransferParams
      }
    : never
export type InferModuleType<T extends AnyNewBalanceModule> =
  InferBalanceModuleTypes<T>["TModuleType"]
export type InferTokenType<T extends AnyNewBalanceModule> = InferBalanceModuleTypes<T>["TTokenType"]
export type InferChainMeta<T extends AnyNewBalanceModule> = InferBalanceModuleTypes<T>["TChainMeta"]
export type InferModuleConfig<T extends AnyNewBalanceModule> =
  InferBalanceModuleTypes<T>["TModuleConfig"]
export type InferTransferParams<T extends AnyNewBalanceModule> =
  InferBalanceModuleTypes<T>["TTransferParams"]
