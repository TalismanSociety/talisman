// import { SearchInput } from "@talisman/components/SearchInput"
// import { ToolbarFilterIcon, ToolbarSortIcon } from "@talismn/icons"
// import { FC, SVGProps } from "react"

// import { usePortfolio } from "./usePortfolio"

// const ToolbarButton: FC<{ icon: FC<SVGProps<SVGSVGElement>> }> = ({ icon: Icon }) => (
//   <button type="button">
//     <Icon />
//   </button>
// )

// export const TokensToolbar = () => {
//   // const { t } = useTranslation()
//   const { setSearch } = usePortfolio()

//   return (
//     <div className="flex h-[3.6rem] items-center justify-between">
//       <div className="grow">
//         <SearchInput
//           containerClassName="!bg-field ring-grey-700 rounded-sm max-w-[374rem] h-[3.6rem]"
//           placeholder="Search tokens"
//           onChange={setSearch}
//         />
//       </div>
//       {/* <ContextMenu>
//         <ContextMenuTrigger><ToolbarSortIcon /></ContextMenuTrigger>
//       </ContextMenu> */}
//       <ToolbarButton icon={ToolbarSortIcon} />
//       <ToolbarButton icon={ToolbarFilterIcon} />
//     </div>
//   )
// }
