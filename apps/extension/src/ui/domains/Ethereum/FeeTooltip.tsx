import type { TokenId } from "@talismn/chaindata-provider"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useTranslation } from "react-i18next"

export const FeeTooltip = ({
  estimatedFee,
  maxFee,
  l1DataFee,
  tokenId,
  balance,
}: {
  estimatedFee: bigint | undefined
  maxFee: bigint | undefined
  l1DataFee?: bigint | null
  tokenId: TokenId | undefined
  balance: bigint | null | undefined
}) => {
  const { t } = useTranslation()

  if (!estimatedFee && !maxFee && balance === undefined) return null

  return (
    <div className="flex flex-col gap-2 whitespace-nowrap text-sm">
      {!!estimatedFee && (
        <div className="flex w-full justify-between gap-8">
          <div>{t("Estimated Fee:")}</div>
          <div>
            <TokensAndFiat tokenId={tokenId} planck={estimatedFee} noTooltip noCountUp />
          </div>
        </div>
      )}
      {!!l1DataFee && (
        <div className="flex w-full justify-between gap-8">
          <div>{t("Incl. L1 Data Fee:")}</div>
          <div>
            <TokensAndFiat tokenId={tokenId} planck={l1DataFee} noTooltip noCountUp />
          </div>
        </div>
      )}
      {!!maxFee && (
        <div className="flex w-full justify-between gap-8">
          <div>{t("Max Fee:")}</div>
          <div>
            <TokensAndFiat tokenId={tokenId} planck={maxFee} noTooltip noCountUp />
          </div>
        </div>
      )}
      {balance !== undefined && (
        <div className="flex w-full justify-between gap-8">
          <div>{t("Balance:")}</div>
          <div>
            <TokensAndFiat tokenId={tokenId} planck={balance ?? 0n} noTooltip noCountUp isBalance />
          </div>
        </div>
      )}
    </div>
  )
}
