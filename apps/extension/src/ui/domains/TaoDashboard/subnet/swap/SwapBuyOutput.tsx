import type { TokenId } from "@talismn/chaindata-provider"
import { cn } from "@talismn/util"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useToken } from "@ui/state"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"
import { useTaoDashboardSubnetPickerModal } from "../TaoDashboardSubnetPickerModal"

export const SwapBuyOutput: FC<{
  tokenId: TokenId
  value: bigint | null
}> = ({ tokenId, value }) => (
  <div className="flex w-full flex-col gap-6 overflow-hidden rounded bg-black p-6">
    <div className="flex h-20 w-full items-center justify-between gap-6 overflow-hidden text-[2rem]">
      <TokensAndFiat
        noFiat
        noCountUp
        tokenId={tokenId}
        planck={value ?? 0n}
        className={cn(value === null && "text-body-disabled")}
      />
      <TokenDisplay tokenId={tokenId} />
    </div>
  </div>
)

const TokenDisplay: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
  const { t } = useTranslation()
  const token = useToken(tokenId, "substrate-dtao")
  const { open } = useTaoDashboardSubnetPickerModal()

  const handleClick = useCallback(() => {
    if (!token) return
    open({ netuid: token.netuid })
  }, [token, open])

  if (!token) return null

  return (
    <PillButton onClick={handleClick} className="bg-transparent">
      <div className="flex items-center gap-4">
        <TokenLogo className="text-xl" tokenId={tokenId} />
        <div className="flex flex-col items-start gap-1">
          <div className="text-base text-body">SN{token.netuid}</div>
          <div className="text-body-secondary text-xs">
            {token.subnetName ?? t("Subnet {{netuid}}", { netuid: token.netuid })}
          </div>
        </div>
      </div>
    </PillButton>
  )
}
