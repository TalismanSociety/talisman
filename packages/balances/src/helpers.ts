import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider } from "@talismn/chaindata-provider"

import {
  BalanceModule,
  DefaultChainMeta,
  DefaultModuleConfig,
  ExtendableChainMeta,
  ExtendableModuleConfig,
  ExtendableTokenType,
} from "./BalanceModule"
import { AddressesByToken, Balances, SubscriptionCallback, UnsubscribeFn } from "./types"

/**
 * Wraps a BalanceModule's fetch/subscribe methods with a single `balances` method.
 * This `balances` method will subscribe if a callback parameter is provided, or otherwise fetch.
 */
export async function balances<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig>,
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<TTokenType>
): Promise<Balances>
export async function balances<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig>,
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<TTokenType>,
  callback: SubscriptionCallback<Balances>
): Promise<UnsubscribeFn>
export async function balances<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(
  balanceModule: BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig>,
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<TTokenType>,
  callback?: SubscriptionCallback<Balances>
): Promise<Balances | UnsubscribeFn> {
  // subscription request
  if (callback !== undefined)
    return await balanceModule.subscribeBalances(
      chainConnector,
      chaindataProvider,
      addressesByToken,
      callback
    )

  // one-off request
  return await balanceModule.fetchBalances(chainConnector, chaindataProvider, addressesByToken)
}
