import { TokenId } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { YieldDto } from "extension-core"
import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { WizardModalDialog } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"

import { YieldxyzProductYieldDisplay } from "../../components/YieldxyzProductYieldDisplay"
import { YieldxyzProviderLogo } from "../../components/YieldxyzProviderLogo"
import { useYieldxyzOpportunitiesForTokenId } from "../../hooks/useYieldxyzOportunitiesForTokenId"
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
      <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
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
        <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
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
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={cn(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left text-sm",
        selected && "bg-grey-800 text-body-secondary",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <YieldxyzProviderLogo providerId={product.providerId} className="shrink-0 !text-xl" />
      <div className="flex grow items-center overflow-hidden">
        <div className="flex w-full flex-col gap-2 overflow-hidden">
          <div className="line-clamp-2">{product.metadata.name}</div>
        </div>
        {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
      </div>
      <div className="shrink-0">
        <YieldxyzProductYieldDisplay product={product} />
      </div>
    </button>
  )
}

// const Metric: FC<
//   PropsWithChildren<{ icon: ReactNode; tooltip: ReactNode; className?: string }>
// > = ({ children, icon, tooltip, className }) => {
//   const { t } = useTranslation()
//   return (
//     <Tooltip>
//       <TooltipTrigger asChild>
//         <div className={cn("inline-flex shrink-0 items-center gap-2", className)}>
//           <div className="shrink-0 align-text-bottom font-medium">{icon}</div>
//           <div>{children ?? t("N/A")}</div>
//         </div>
//       </TooltipTrigger>
//       <TooltipContent>{tooltip}</TooltipContent>
//     </Tooltip>
//   )
// }
