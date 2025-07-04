import { IBalanceModule } from "../IBalanceModule"

export const getMiniMetadata: IBalanceModule<"evm-erc20">["getMiniMetadata"] = () => {
  throw new Error("MiniMetadata is not supported for ethereum tokens")
}
