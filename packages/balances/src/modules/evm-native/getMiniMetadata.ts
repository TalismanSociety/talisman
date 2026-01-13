import type { IBalanceModule } from "../../types/IBalanceModule"
import type { MODULE_TYPE } from "./config"

export const getMiniMetadata: IBalanceModule<typeof MODULE_TYPE>["getMiniMetadata"] = () => {
  throw new Error("MiniMetadata is not supported for ethereum tokens")
}
