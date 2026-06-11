import type { Balances } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

type UseBittensorFeeErrorProps = {
  allBalances: Balances
  address: string | null | undefined
  feeEstimate: bigint | null | undefined
  feeTokenId: TokenId | null | undefined
}

export const useBittensorFeeError = ({
  allBalances,
  address,
  feeEstimate,
  feeTokenId,
}: UseBittensorFeeErrorProps) => {
  const { t } = useTranslation()
  const existentialDeposit = useExistentialDeposit(feeTokenId)

  const transferable = useMemo(() => {
    if (!address || !feeTokenId) return 0n

    const balance = allBalances.each.find(
      (b) => b.tokenId === feeTokenId && isAddressEqual(b.address, address)
    )

    return balance?.transferable.planck ?? 0n
  }, [allBalances, address, feeTokenId])

  return useMemo(() => {
    if (typeof feeEstimate !== "bigint") return null

    if (feeEstimate > transferable) return t("Insufficient TAO to cover fee")

    if (
      typeof existentialDeposit?.planck === "bigint" &&
      existentialDeposit.planck + feeEstimate > transferable
    )
      return t("Insufficient TAO to cover fee and keep account alive")

    return null
  }, [existentialDeposit?.planck, feeEstimate, t, transferable])
}
