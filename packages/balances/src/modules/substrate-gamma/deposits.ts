import { parseSubGammaTokenId, SubGammaTokenSchema } from "@talismn/chaindata-provider"

import type { AmountWithLabel, IBalance } from "../../types"
import type { GammaDeposit } from "./chain"

const MODULE_TYPE = SubGammaTokenSchema.shape.type.value
const LABEL_PREFIX = "gamma-deposit:"

type GammaDepositMeta = {
  type: "gamma-deposit"
  hotkey: string
  spendable: string
  dailySpendCap: string | null
}

export type GammaDepositStatus = "open" | "capped" | "paused"

export type GammaDepositView = {
  hotkey: string
  balance: bigint
  spendable: bigint
  dailySpendCap: bigint | null
  status: GammaDepositStatus
}

const getStatus = ({ balance, spendable, dailySpendCap }: Omit<GammaDepositView, "status">) => {
  if (dailySpendCap === 0n) return "paused"
  if (spendable < balance) return "capped"
  return "open"
}

export const toGammaBalance = (
  address: string,
  tokenId: string,
  deposits: GammaDeposit[]
): (IBalance & { values: AmountWithLabel<string>[] }) | null => {
  const values = deposits
    .filter(({ balance }) => balance > 0n)
    .map(
      ({ hotkey, balance, spendable, dailySpendCap }): AmountWithLabel<string> => ({
        type: "reserved",
        label: `${LABEL_PREFIX}${hotkey}`,
        amount: balance.toString(),
        meta: {
          type: "gamma-deposit",
          hotkey,
          spendable: spendable.toString(),
          dailySpendCap: dailySpendCap?.toString() ?? null,
        } satisfies GammaDepositMeta,
      })
    )
  if (!values.length) return null

  return {
    source: MODULE_TYPE,
    status: "live",
    address,
    tokenId,
    networkId: parseSubGammaTokenId(tokenId).networkId,
    values,
  }
}

const isGammaDepositMeta = (meta: unknown): meta is GammaDepositMeta =>
  (meta as GammaDepositMeta | undefined)?.type === "gamma-deposit"

export const getGammaDeposits = (balance: Pick<IBalance, "values">): GammaDepositView[] =>
  (balance.values ?? []).flatMap(({ type, amount, meta }) => {
    if (type !== "reserved" || !isGammaDepositMeta(meta)) return []
    const deposit = {
      hotkey: meta.hotkey,
      balance: BigInt(amount),
      spendable: BigInt(meta.spendable),
      dailySpendCap: meta.dailySpendCap === null ? null : BigInt(meta.dailySpendCap),
    }
    return [{ ...deposit, status: getStatus(deposit) }]
  })

export const getGammaSpendable = (balance: Pick<IBalance, "values">): bigint =>
  getGammaDeposits(balance).reduce((sum, { spendable }) => sum + spendable, 0n)
