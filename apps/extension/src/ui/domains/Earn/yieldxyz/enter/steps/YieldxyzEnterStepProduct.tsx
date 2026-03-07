import type { YieldDto } from "@core/domains/earn/exports"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import type { TokenId } from "@talismn/chaindata-provider"
import { CheckCircleIcon, LockIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import { WizardModalDialog } from "@ui/talisman-ui/components/WizardModalDialog"
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
  const { pickerTokenId, onProductChanged, productId, goTo } = useYieldxyzEnterWizard()

  if (!pickerTokenId) throw new Error("PickerTokenId is not defined")

  return (
    <WizardModalDialog
      className="size-full border-none"
      title={t("Select Yield Opportunity")}
      contentClassName="p-0"
      onCloseClick={close}
      onBackClick={() => goTo("token")}
    >
      <YieldxyzProductPicker
        tokenId={pickerTokenId}
        productId={productId}
        onSelect={onProductChanged}
      />
    </WizardModalDialog>
  )
}

const YieldxyzProductPicker: FC<{
  tokenId: TokenId
  productId?: string | null
  onSelect: (productId: string) => void
}> = ({ tokenId, productId, onSelect }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const products = useYieldxyzOpportunitiesForTokenId(tokenId) // hypothetical hook to get available products

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
        <ProductsList products={displayProducts} selected={productId ?? null} onSelect={onSelect} />
      </ScrollContainer>
    </div>
  )
}

const ProductsList: FC<{
  products: YieldDto[]
  selected: string | null
  onSelect: (productId: string) => void
}> = ({ products, selected, onSelect }) => {
  const { t } = useTranslation()
  return (
    <div>
      {products?.map((product) => (
        <ProductRow
          key={product.id}
          product={product}
          selected={product.id === selected}
          onClick={() => onSelect(product.id)}
        />
      ))}
      {!products?.length && (
        <div className="flex h-[5.8rem] w-full items-center px-12 text-left text-body-secondary">
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
}> = ({ product, selected, onClick }) => {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={cn(
        "flex h-[5.8rem] w-full items-center gap-4 px-12 text-left text-sm hover:bg-grey-750 focus:bg-grey-700",
        selected && "bg-grey-800 text-body-secondary",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      <YieldxyzProviderLogo providerId={product.providerId} className="!text-xl shrink-0" />
      <div className="flex grow items-center overflow-hidden">
        <div className="flex w-full flex-col gap-2 overflow-hidden">
          <div className="line-clamp-2">{product.metadata.name}</div>
        </div>
        {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-1 text-right">
        <YieldxyzProductYieldDisplay product={product} />
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
    </button>
  )
}

const Metric: FC<
  PropsWithChildren<{ icon: ReactNode; tooltip: ReactNode; className?: string }>
> = ({ children, icon, tooltip, className }) => {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex shrink-0 items-center gap-2", className)}>
          <div className="shrink-0 align-text-bottom font-medium">{icon}</div>
          <div>{children ?? t("N/A")}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
