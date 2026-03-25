import type { YieldDto } from "@core/domains/earn/exports"
import type { TokenId } from "@talismn/chaindata-provider"
import { CheckCircleIcon, LockIcon } from "@talismn/icons"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { type FC, type PropsWithChildren, type ReactNode, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { YieldxyzProductYieldDisplay } from "../../components/YieldxyzProductYieldDisplay"
import { YieldxyzProviderLogo } from "../../components/YieldxyzProviderLogo"
import { useYieldxyzOpportunitiesForTokenId } from "../../hooks/useYieldxyzOpportunitiesForTokenId"
import { useYieldxyzEnterModal } from "../useYieldxyzEnterModal"
import { useYieldxyzEnterWizard } from "../useYieldxyzEnterWizard"

export const YieldxyzEnterStepProduct: FC = () => {
  const { t } = useTranslation()
  const { close } = useYieldxyzEnterModal()
  const { pickerTokenId, onProductChanged, productId, canGoBack, goBack, discoverOnly } =
    useYieldxyzEnterWizard()

  if (!pickerTokenId) throw new Error("PickerTokenId is not defined")

  return (
    <WizardModalDialog
      className="size-full border-none"
      title={t("Select Yield Opportunity")}
      contentClassName="p-0"
      onCloseClick={close}
      onBackClick={canGoBack ? goBack : undefined}
    >
      <YieldxyzProductPicker
        tokenId={pickerTokenId}
        productId={productId}
        onSelect={onProductChanged}
        disabled={discoverOnly}
      />
    </WizardModalDialog>
  )
}

const YieldxyzProductPicker: FC<{
  tokenId: TokenId
  productId?: string | null
  onSelect: (productId: string) => void
  disabled?: boolean
}> = ({ tokenId, productId, onSelect, disabled }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const token = useToken(tokenId)

  const disabledReason = useMemo(
    () => (disabled ? t("You do not have any {{symbol}}", { symbol: token?.symbol ?? "" }) : null),
    [disabled, token?.symbol, t]
  )

  const products = useYieldxyzOpportunitiesForTokenId(tokenId)

  const displayProducts = useMemo(() => {
    if (!search) return products

    return products?.filter((p) => {
      return [p.id, p.metadata.name, ...(p.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    })
  }, [products, search])

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full flex-col items-center gap-2 px-12 pb-8">
        <SearchInput onChange={setSearch} placeholder={t("Search DeFi products")} />
      </div>
      <ScrollContainer className="scrollable h-full w-full grow overflow-x-hidden border-grey-700 border-t bg-black-secondary">
        <ProductsList
          products={displayProducts}
          selected={productId ?? null}
          onSelect={onSelect}
          disabledReason={disabledReason}
        />
      </ScrollContainer>
    </div>
  )
}

const ProductsList: FC<{
  products: YieldDto[]
  selected: string | null
  onSelect: (productId: string) => void
  disabledReason?: string | null
}> = ({ products, selected, onSelect, disabledReason }) => {
  const { t } = useTranslation()
  return (
    <div>
      {products?.map((product) => (
        <ProductRow
          key={product.id}
          product={product}
          selected={product.id === selected}
          onClick={() => onSelect(product.id)}
          disabledReason={disabledReason}
        />
      ))}
      {!products?.length && (
        <div className="flex h-14.5 w-full items-center px-12 text-left text-body-secondary">
          {t("No product matches your search")}
        </div>
      )}
    </div>
  )
}

const ProductRow: FC<{
  product: YieldDto
  selected: boolean
  onClick: () => void
  disabledReason?: string | null
}> = ({ product, selected, onClick, disabledReason }) => {
  const { t } = useTranslation()
  const disabled = !!disabledReason
  return (
    <Tooltip placement="center">
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          tabIndex={0}
          className={cn(
            "flex h-14.5 w-full items-center gap-4 px-12 text-left text-sm",
            !disabled && "hover:bg-grey-750 focus:bg-grey-700",
            selected && "bg-grey-800 text-body-secondary",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:[&_*]:pointer-events-none"
          )}
        >
          <YieldxyzProviderLogo providerId={product.providerId} className="shrink-0 text-xl!" />
          <div className="flex grow items-center overflow-hidden">
            <div className="flex w-full flex-col gap-2 overflow-hidden">
              <div className="truncate">{product.metadata.name}</div>
              <Metric
                icon={<LockIcon />}
                tooltip={t("Total value locked")}
                className="text-body-secondary text-xs"
              >
                {product.statistics &&
                  Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    notation: "compact",
                  }).format(Number(product.statistics?.tvlUsd ?? 0))}
              </Metric>
            </div>
            {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
          </div>
          <div className="shrink-0 text-right">
            <YieldxyzProductYieldDisplay product={product} />
          </div>
        </button>
      </TooltipTrigger>
      {disabledReason && <TooltipContent>{disabledReason}</TooltipContent>}
    </Tooltip>
  )
}

const Metric: FC<
  PropsWithChildren<{ icon: ReactNode; tooltip: ReactNode; className?: string }>
> = ({ children, icon, tooltip, className }) => {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex shrink-0 items-center gap-2 self-start", className)}>
          <div className="shrink-0 align-text-bottom font-medium">{icon}</div>
          <div>{children ?? t("N/A")}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
