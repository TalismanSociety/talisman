import { createNoopSigner, address as solAddress } from "@solana/kit"
import { getTransferSolInstruction } from "@solana-program/system"
import { isTokenOfType } from "@talismn/chaindata-provider"

import type { IBalanceModule } from "../../types/IBalanceModule"
import { MODULE_TYPE } from "./config"

export const getTransferCallData: IBalanceModule<typeof MODULE_TYPE>["getTransferCallData"] = ({
  from,
  to,
  value,
  token,
}) => {
  if (!isTokenOfType(token, MODULE_TYPE))
    throw new Error(`Token type ${token.type} is not ${MODULE_TYPE}.`)

  const transferIx = getTransferSolInstruction({
    source: createNoopSigner(solAddress(from)), // signature is provided at signing time
    destination: solAddress(to),
    amount: BigInt(value),
  })

  return [transferIx]
}
