import type { IBalanceModule } from "../../types/IBalanceModule"
import type { MODULE_TYPE } from "./config"

export const getTransferCallData: IBalanceModule<typeof MODULE_TYPE>["getTransferCallData"] =
  () => {
    // PSBT construction needs the utxo set, a fee rate and a change address — none of which
    // fit this signature. The send flow builds transfers with @talismn/bitcoin directly.
    throw new Error("Use @talismn/bitcoin buildTransferPsbt for btc-native transfers")
  }
