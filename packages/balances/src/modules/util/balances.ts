import {
  BalanceModule,
  DefaultChainMeta,
  DefaultModuleConfig,
  DefaultTransferParams,
  ExtendableChainMeta,
  ExtendableModuleConfig,
  ExtendableTransferParams,
  SelectableTokenType,
  SubscriptionResultWithStatus,
} from "../../BalanceModule"
import { AddressesByToken, Balances, SubscriptionCallback, UnsubscribeFn } from "../../types"

/**
 * Wraps a BalanceModule's fetch/subscribe methods with a single `balances` method.
 * This `balances` method will subscribe if a callback parameter is provided, or otherwise fetch.
 */
export async function balances<
  TModuleType extends string,
  TTokenType extends SelectableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams,
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams>,
  addressesByToken: AddressesByToken<TTokenType>,
): Promise<Balances>
export async function balances<
  TModuleType extends string,
  TTokenType extends SelectableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams,
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams>,
  addressesByToken: AddressesByToken<TTokenType>,
  callback: SubscriptionCallback<Balances | SubscriptionResultWithStatus>,
): Promise<UnsubscribeFn>
export async function balances<
  TModuleType extends string,
  TTokenType extends SelectableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams,
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams>,
  addressesByToken: AddressesByToken<TTokenType>,
  callback?: SubscriptionCallback<Balances | SubscriptionResultWithStatus>,
): Promise<Balances | UnsubscribeFn> {
  // subscription request
  if (callback !== undefined)
    return await balanceModule.subscribeBalances({ addressesByToken }, callback)

  // one-off request
  return await balanceModule.fetchBalances(addressesByToken)
}
