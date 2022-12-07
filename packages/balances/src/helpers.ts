import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
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
  chainConnectors: { substrate?: ChainConnector; evm?: ChainConnectorEvm },
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
  chainConnectors: { substrate?: ChainConnector; evm?: ChainConnectorEvm },
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
  chainConnectors: { substrate?: ChainConnector; evm?: ChainConnectorEvm },
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<TTokenType>,
  callback?: SubscriptionCallback<Balances>
): Promise<Balances | UnsubscribeFn> {
  // subscription request
  if (callback !== undefined)
    return await balanceModule.subscribeBalances(
      chainConnectors,
      chaindataProvider,
      addressesByToken,
      callback
    )

  // one-off request
  return await balanceModule.fetchBalances(chainConnectors, chaindataProvider, addressesByToken)
}
