import {
  Amount,
  Balance,
  BalanceModule,
  Balances,
  DefaultBalanceModule,
  LockedAmount,
  NewBalanceType,
} from "@talismn/balances"
import { ChainId, NewTokenType, SubChainId } from "@talismn/chaindata-provider"

type ModuleType = "substrate-native"

export type SubNativeToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    chain: { id: ChainId } | null
  }
>
export type CustomSubNativeToken = SubNativeToken & {
  isCustom: true
}

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    SubNativeToken: SubNativeToken
    CustomSubNativeToken: CustomSubNativeToken
  }
}

export type SubNativeBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: SubChainId

    free: Amount
    reserves: Amount
    locks: [LockedAmount<"fees">, LockedAmount<"misc">]
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    SubNativeBalance: SubNativeBalance
  }
}

export const SubNativeModule: BalanceModule<ModuleType, SubNativeToken | CustomSubNativeToken> = {
  ...DefaultBalanceModule("substrate-native"),

  async subscribeBalances(chainConnector, chaindataProvider, addressesByToken, callback) {
    callback(
      null,
      new Balances([
        new Balance({
          source: "substrate-native",
          status: "live",
          address: "0x0",
          multiChainId: { subChainId: "0x0" },
          chainId: "0x0",
          tokenId: "0x0",

          free: ((Math.floor(Math.random() * 9) + 1) * Math.pow(10, 18)).toString(),
          reserves: ((Math.floor(Math.random() * 9) + 1) * Math.pow(10, 18)).toString(),
          locks: [
            {
              label: "fees",
              amount: ((Math.floor(Math.random() * 9) + 1) * Math.pow(10, 18)).toString(),
            },
            {
              label: "misc",
              amount: ((Math.floor(Math.random() * 9) + 1) * Math.pow(10, 18)).toString(),
            },
          ],
        }),
      ])
    )
    return () => {}
  },
}
