import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { isAddressEqual } from "@talismn/crypto"
import z from "zod/v4"

import { fetchRuntimeCallResult } from "../shared"

export type GammaDeposit = {
  netuid: number
  hotkey: string
  balance: bigint
  spendable: bigint
  dailySpendCap: bigint | null
}

export class GammaWireShapeError extends Error {
  override name = "GammaWireShapeError"

  constructor(method: string, reason: string, options?: { cause?: unknown }) {
    super(`unsupported GammaRuntimeApi.${method} shape: ${reason}`, options)
  }
}

const RUNTIME_API = "GammaRuntimeApi"
const DEPOSITS_FOR_COLDKEY = "get_gamma_deposits_for_coldkey"

const DepositsForColdkeySchema = z.array(
  z.object({
    netuid: z.number(),
    hotkey: z.string(),
    deposit: z.object({
      coldkey: z.string(),
      balance: z.bigint(),
      daily_spend_cap: z.object({ cap: z.bigint() }).optional(),
    }),
    spendable: z.bigint(),
  })
)

const parseDepositsForColdkey = (coldkey: string, decoded: unknown): GammaDeposit[] => {
  const parsed = DepositsForColdkeySchema.safeParse(decoded)
  if (!parsed.success)
    throw new GammaWireShapeError(DEPOSITS_FOR_COLDKEY, z.prettifyError(parsed.error), {
      cause: parsed.error,
    })

  return parsed.data.map(({ netuid, hotkey, deposit, spendable }) => {
    if (!isAddressEqual(deposit.coldkey, coldkey))
      throw new GammaWireShapeError(
        DEPOSITS_FOR_COLDKEY,
        `deposit coldkey ${deposit.coldkey} is not the queried coldkey ${coldkey}`
      )
    if (spendable > deposit.balance)
      throw new GammaWireShapeError(
        DEPOSITS_FOR_COLDKEY,
        `spendable ${spendable} exceeds balance ${deposit.balance}`
      )

    return {
      netuid,
      hotkey,
      balance: deposit.balance,
      spendable,
      dailySpendCap: deposit.daily_spend_cap?.cap ?? null,
    }
  })
}

export const fetchOwnedGammaDeposits = async ({
  connector,
  networkId,
  metadataRpc,
  coldkeys,
  at,
}: {
  connector: IChainConnectorDot
  networkId: string
  metadataRpc: `0x${string}`
  coldkeys: string[]
  at: `0x${string}`
}): Promise<Map<string, GammaDeposit[] | Error>> =>
  new Map(
    await Promise.all(
      coldkeys.map(async (coldkey): Promise<[string, GammaDeposit[] | Error]> => {
        try {
          const decoded = await fetchRuntimeCallResult<unknown>(
            connector,
            networkId,
            metadataRpc,
            RUNTIME_API,
            DEPOSITS_FOR_COLDKEY,
            [coldkey],
            at
          )
          return [coldkey, parseDepositsForColdkey(coldkey, decoded)]
        } catch (error) {
          return [coldkey, error instanceof Error ? error : new Error(String(error))]
        }
      })
    )
  )
