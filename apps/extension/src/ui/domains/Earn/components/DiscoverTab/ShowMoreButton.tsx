// import { FC } from "react"
// import { useTranslation } from "react-i18next"

// interface ShowMoreButtonProps {
//   onClick: () => void
//   itemsShown?: number
//   totalItems?: number
//   isFetching?: boolean
//   isPopup?: boolean
// }

// export const ShowMoreButton: FC<ShowMoreButtonProps> = ({
//   onClick,
//   itemsShown,
//   totalItems,
//   isFetching = false,
//   isPopup = false,
// }) => {
//   const { t } = useTranslation()

//   // Hide button if all items are shown (for client-side pagination)
//   if (itemsShown !== undefined && totalItems !== undefined && itemsShown >= totalItems) {
//     return null
//   }

//   return (
//     <div className="flex w-full justify-center">
//       <button
//         type="button"
//         onClick={onClick}
//         disabled={isFetching}
//         className={`bg-grey-800 hover:bg-grey-750 text-body-secondary hover:text-body rounded px-4 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
//           isPopup ? "text-xs" : "text-sm"
//         }`}
//       >
//         {isFetching ? t("Loading...") : t("Show more")}
//       </button>
//     </div>
//   )
// }
