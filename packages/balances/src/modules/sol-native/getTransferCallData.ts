import { PublicKey, SystemProgram } from "@solana/web3.js"
import { isTokenOfType } from "@talismn/chaindata-provider"

import { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"

export const getTransferCallData: IBalanceModule<typeof MODULE_TYPE>["getTransferCallData"] = ({
  from,
  to,
  value,
  token,
}) => {
  if (!isTokenOfType(token, MODULE_TYPE))
    throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

  const fromPubkey = new PublicKey(from)

  const transferIx = SystemProgram.transfer({
    fromPubkey,
    toPubkey: new PublicKey(to),
    lamports: Number(value),
  })

  return [transferIx]
}
