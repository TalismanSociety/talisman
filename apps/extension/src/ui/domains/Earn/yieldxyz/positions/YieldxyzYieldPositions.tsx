import { ChevronLeftIcon } from "@talismn/icons"
import { YieldDto, YieldxyzPositionEnhanced } from "extension-core"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useYieldxyzProduct } from "@ui/state/yield"

import { EarnTypeBadge } from "../../components/EarnTypeBadge"
import { YieldxyzProviderLogo } from "../components/YieldxyzProviderLogo"
import { useYieldxyzYieldPositions } from "../hooks/useYieldxyzYieldPositions"

/**
 * ⚠️ yield.xyz api returns 1/n positions for a given yield and an address. Also, returned positions dont have an id.
 * => we need to display n positions on this page.
 *
 * TODO think of a better name for both this component and associated hook
 */
export const YieldxyzYieldPositions: FC<{ yieldId: string; address: string }> = ({
  yieldId,
  address,
}) => {
  const { data: product } = useYieldxyzProduct(yieldId)
  const { status, data: balances } = useYieldxyzYieldPositions(yieldId, address)

  if (!product) return null

  return (
    <div>
      <NavHeader isLoading={status === "loading"} address={address} product={product} />
      {balances?.map((balance, index) => (
        <PositionBalance key={index} balance={balance} isLoading={status === "loading"} />
      ))}
      {/* <div>
          Yieldxyz Yield Positions for yieldId: {yieldId} and address: {address}
        </div> */}
    </div>
  )
}

const NavHeader: FC<{ address: string; product: YieldDto; isLoading: boolean }> = ({
  address,
  product,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()

  return (
    <div className="flex h-28 w-full items-center gap-8">
      <div className="flex h-full grow items-center gap-4 overflow-hidden">
        <IconButton onClick={() => navigate("/earn", true)}>
          <ChevronLeftIcon />
        </IconButton>
        <YieldxyzProviderLogo providerId={product.providerId} className="size-[3.6rem]" />
        {/* <AssetLogo
              url={
                (position.balances[0] as unknown as { validator?: { logoURI?: string } })?.validator
                  ?.logoURI ||
                position.product?.metadata.logoURI ||
                position.balances[0]?.token.logoURI
              }
              className="size-[3.6rem]"
            /> */}
        <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden">
          <div className="flex w-full items-center gap-8">
            <div className="text-body flex grow items-center overflow-hidden">
              <div className="truncate">{product.metadata.name}</div>
              <EarnTypeBadge className="shrink-0 text-xs">{product.mechanics?.type}</EarnTypeBadge>
            </div>
            <div className="text-body-secondary shrink-0">{t("Total")}</div>
          </div>
          <div className="flex w-full items-center gap-8 text-sm">
            <div className="text-body-secondary grow">
              <PortfolioAccount address={address} />
            </div>
            <div className="shrink-0">-</div>
          </div>
        </div>
        {/* <div className="flex grow flex-col gap-2 overflow-hidden">
              <div className="text-body flex items-center gap-2 truncate text-sm font-bold">
                <div className="grow truncate">{product.metadata.name} <EarnTypeBadge>{product.mechanics?.type}</EarnTypeBadge></div>
                <div className="text-body-secondary border-grey-500 rounded-xs shrink-0 border px-2 py-1 text-[0.8rem]">
                  {(position.product?.mechanics.type || "").toLocaleUpperCase()}
                </div>
              </div>
              <div className="text-body-secondary truncate text-xs">
                <PortfolioAccount address={address} />
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 text-right">
              <div className="text-body-secondary text-sm">{t("Total")}</div>
              <div className="text-body text-base font-bold">
                <FiatFromUsd amount={totalValue} isBalance />
              </div>
            </div> */}
      </div>
    </div>
  )
}

const PositionBalance: FC<{ balance: YieldxyzPositionEnhanced; isLoading: boolean }> = () => {
  return <div></div>
}
