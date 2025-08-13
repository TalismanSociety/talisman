import { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"

export const getMiniMetadata: IBalanceModule<typeof MODULE_TYPE>["getMiniMetadata"] = () => {
  throw new Error("MiniMetadata is not supported for sol-native tokens")
}
