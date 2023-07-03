import { TokenId } from "@talismn/chaindata-provider"
import useToken from "@ui/hooks/useToken"
import { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

export const SignViewStakingSetAutoCompound: FC<{
  tokenId: TokenId
  autoCompound: number
}> = ({ tokenId, autoCompound }) => {
  const { t } = useTranslation("request")
  const token = useToken(tokenId)

  if (!token) return null

  const symbol = token.symbol

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Trans t={t}>
        <div>
          All future <span className="text-body">{symbol}</span> staking rewards will be
        </div>
        <div>
          <span className="text-body">{autoCompound}%</span> auto-compounded
        </div>
      </Trans>
    </div>
  )
}
